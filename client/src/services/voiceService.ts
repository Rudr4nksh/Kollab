import { socketService } from './socket.ts';

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
    { urls: 'stun:stun.services.mozilla.com' },
  ],
  iceCandidatePoolSize: 10,
};

interface PeerConnectionData {
  pc: RTCPeerConnection;
  audioEl: HTMLAudioElement;
  pendingCandidates: RTCIceCandidateInit[];
}

class VoiceService {
  private localStream: MediaStream | null = null;
  private peers = new Map<string, PeerConnectionData>();
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private speakingInterval: any = null;

  public isConnected: boolean = false;
  public isMuted: boolean = false;
  public isDeafened: boolean = false;
  public isSpeaking: boolean = false;

  private currentRoomId: string | null = null;
  private currentUserId: string | null = null;

  private unsubSignal: (() => void) | null = null;
  private onSpeakingListeners: ((speaking: boolean) => void)[] = [];
  private onStateChangeListeners: (() => void)[] = [];

  public onSpeaking(cb: (speaking: boolean) => void): () => void {
    this.onSpeakingListeners.push(cb);
    return () => {
      this.onSpeakingListeners = this.onSpeakingListeners.filter((l) => l !== cb);
    };
  }

  public onStateChange(cb: () => void): () => void {
    this.onStateChangeListeners.push(cb);
    return () => {
      this.onStateChangeListeners = this.onStateChangeListeners.filter((l) => l !== cb);
    };
  }

  private notifyStateChange() {
    this.onStateChangeListeners.forEach((l) => l());
  }

  public async joinVoice(roomId: string, userId: string): Promise<boolean> {
    if (this.isConnected) return true;

    try {
      this.currentRoomId = roomId;
      this.currentUserId = userId;

      // 1. Request microphone access with echo cancellation & noise suppression
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      this.localStream = stream;
      this.isConnected = true;
      this.isMuted = false;
      this.isDeafened = false;

      // Attach audio tracks to any existing peer connections created before mic acquisition
      this.peers.forEach(({ pc }) => {
        const senders = pc.getSenders();
        stream.getAudioTracks().forEach((track) => {
          if (!senders.some((s) => s.track === track)) {
            pc.addTrack(track, stream);
          }
        });
      });

      // 2. Setup AudioContext level detector for Discord green speaking ring
      this.setupSpeakingDetector(stream);

      // Resume AudioContext if suspended by browser autoplay policy
      if (this.audioContext && this.audioContext.state === 'suspended') {
        try {
          await this.audioContext.resume();
        } catch {
          // ignore
        }
      }

      // 3. Notify socket server
      socketService.emitVoiceJoin(roomId, userId);

      // 4. Setup WebRTC signal listener
      this.unsubSignal = socketService.onVoiceSignal(async ({ fromUserId, signal }) => {
        await this.handleIncomingSignal(fromUserId, signal);
      });

      this.notifyStateChange();
      return true;
    } catch (err) {
      console.warn('[VoiceService] Could not access microphone or connect:', err);
      this.isConnected = false;
      this.notifyStateChange();
      return false;
    }
  }

  public leaveVoice() {
    if (!this.isConnected) return;

    if (this.currentRoomId && this.currentUserId) {
      socketService.emitVoiceLeave(this.currentRoomId, this.currentUserId);
    }

    // Stop speaking detection
    if (this.speakingInterval) {
      clearInterval(this.speakingInterval);
      this.speakingInterval = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
      } catch {
        // ignore
      }
      this.audioContext = null;
      this.analyser = null;
    }

    // Stop all local audio tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    // Close all peer connections and remove audio elements
    this.peers.forEach(({ pc, audioEl }) => {
      try {
        pc.close();
        audioEl.srcObject = null;
        audioEl.remove();
      } catch {
        // ignore
      }
    });
    this.peers.clear();

    if (this.unsubSignal) {
      this.unsubSignal();
      this.unsubSignal = null;
    }

    this.isConnected = false;
    this.isMuted = false;
    this.isDeafened = false;
    this.isSpeaking = false;
    this.currentRoomId = null;
    this.currentUserId = null;

    this.notifyStateChange();
  }

  public toggleMute(): boolean {
    if (!this.isConnected || !this.localStream) return this.isMuted;

    this.isMuted = !this.isMuted;
    this.localStream.getAudioTracks().forEach((track) => {
      track.enabled = !this.isMuted;
    });

    if (this.currentRoomId && this.currentUserId) {
      socketService.emitVoiceState(this.currentRoomId, this.currentUserId, {
        isMuted: this.isMuted,
      });
    }

    this.notifyStateChange();
    return this.isMuted;
  }

  public toggleDeafen(): boolean {
    if (!this.isConnected) return this.isDeafened;

    this.isDeafened = !this.isDeafened;

    // When deafened, mute all remote incoming audio
    this.peers.forEach(({ audioEl }) => {
      audioEl.muted = this.isDeafened;
    });

    // Discord also mutes your mic when deafened
    if (this.isDeafened && !this.isMuted) {
      this.toggleMute();
    } else if (!this.isDeafened && this.isMuted) {
      this.toggleMute();
    }

    if (this.currentRoomId && this.currentUserId) {
      socketService.emitVoiceState(this.currentRoomId, this.currentUserId, {
        isDeafened: this.isDeafened,
        isMuted: this.isMuted,
      });
    }

    this.notifyStateChange();
    return this.isDeafened;
  }

  /**
   * Called when peer list updates from server: initiates connection to new peers
   */
  public syncPeers(voiceUserIds: string[]) {
    if (!this.isConnected || !this.currentUserId) return;

    // Connect to peers that are in voice but not in our peer map
    voiceUserIds.forEach((targetUserId) => {
      if (targetUserId !== this.currentUserId && !this.peers.has(targetUserId)) {
        // Deterministic initiator check: smaller string initiates offer
        if (this.currentUserId! < targetUserId) {
          this.initiatePeerConnection(targetUserId);
        }
      }
    });

    // Remove peers that left
    const currentSet = new Set(voiceUserIds);
    this.peers.forEach(({ pc, audioEl }, peerId) => {
      if (!currentSet.has(peerId)) {
        try {
          pc.close();
          audioEl.srcObject = null;
          audioEl.remove();
        } catch {
          // ignore
        }
        this.peers.delete(peerId);
      }
    });
  }

  private createPeerConnection(peerId: string): PeerConnectionData {
    const pc = new RTCPeerConnection(RTC_CONFIG);

    // Audio element for playing remote peer's sound
    const audioEl = document.createElement('audio');
    audioEl.autoplay = true;
    audioEl.setAttribute('playsinline', 'true');
    audioEl.muted = this.isDeafened;
    audioEl.volume = 1.0;
    audioEl.setAttribute('data-kollab-peer', peerId);
    document.body.appendChild(audioEl);

    // Add local tracks to peer connection
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        pc.addTrack(track, this.localStream!);
      });
    }

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && this.currentRoomId && this.currentUserId) {
        socketService.emitVoiceSignal(this.currentRoomId, peerId, this.currentUserId, {
          candidate: event.candidate.toJSON(),
        });
      }
    };

    // When remote audio track arrives
    pc.ontrack = (event) => {
      console.log(`[VoiceService] 🎙️ Remote audio track received from ${peerId}`);
      if (event.streams && event.streams[0]) {
        audioEl.srcObject = event.streams[0];
      } else if (event.track) {
        audioEl.srcObject = new MediaStream([event.track]);
      }

      // Explicitly trigger playback and handle browser autoplay restriction
      const playPromise = audioEl.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn(`[VoiceService] Audio playback waiting for user gesture for ${peerId}:`, err);
          const resumeAudio = () => {
            audioEl.play().catch(() => {});
            window.removeEventListener('click', resumeAudio);
            window.removeEventListener('keydown', resumeAudio);
          };
          window.addEventListener('click', resumeAudio, { once: true });
          window.addEventListener('keydown', resumeAudio, { once: true });
        });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`[VoiceService] Connection state with ${peerId}:`, pc.connectionState);
      if (pc.connectionState === 'failed') {
        // Attempt ICE restart if supported
        try {
          pc.restartIce();
        } catch {
          // ignore
        }
      } else if (pc.connectionState === 'disconnected') {
        // Don't delete immediately; wait for possible reconnection
        setTimeout(() => {
          if (pc.connectionState === 'disconnected' || pc.connectionState === 'closed') {
            this.peers.delete(peerId);
            audioEl.remove();
          }
        }, 3000);
      }
    };

    const peerData: PeerConnectionData = {
      pc,
      audioEl,
      pendingCandidates: [],
    };

    this.peers.set(peerId, peerData);
    return peerData;
  }

  private async initiatePeerConnection(targetUserId: string) {
    const { pc } = this.createPeerConnection(targetUserId);
    try {
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
      });
      await pc.setLocalDescription(offer);
      if (this.currentRoomId && this.currentUserId) {
        socketService.emitVoiceSignal(this.currentRoomId, targetUserId, this.currentUserId, {
          sdp: pc.localDescription,
        });
      }
    } catch (err) {
      console.warn(`[VoiceService] Failed to create offer for ${targetUserId}:`, err);
    }
  }

  private async handleIncomingSignal(fromUserId: string, signal: any) {
    let peer = this.peers.get(fromUserId);
    if (!peer) {
      peer = this.createPeerConnection(fromUserId);
    }

    const { pc, pendingCandidates } = peer;

    try {
      if (signal.sdp) {
        const desc = new RTCSessionDescription(signal.sdp);
        await pc.setRemoteDescription(desc);

        // Drain any ICE candidates received before remote description was ready
        while (pendingCandidates.length > 0) {
          const queuedCand = pendingCandidates.shift();
          if (queuedCand) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(queuedCand));
            } catch (candErr) {
              console.warn('[VoiceService] Error applying buffered ICE candidate:', candErr);
            }
          }
        }

        if (signal.sdp.type === 'offer') {
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          if (this.currentRoomId && this.currentUserId) {
            socketService.emitVoiceSignal(this.currentRoomId, fromUserId, this.currentUserId, {
              sdp: pc.localDescription,
            });
          }
        }
      } else if (signal.candidate) {
        if (pc.remoteDescription && pc.remoteDescription.type) {
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        } else {
          // Buffer candidate until setRemoteDescription completes
          pendingCandidates.push(signal.candidate);
        }
      }
    } catch (err) {
      console.warn(`[VoiceService] Error handling signal from ${fromUserId}:`, err);
    }
  }

  /**
   * Discord-style voice activity level detection using Web Audio API
   */
  private setupSpeakingDetector(stream: MediaStream) {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      this.audioContext = new AudioCtx();
      const source = this.audioContext.createMediaStreamSource(stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.4;
      source.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      let speakingCounter = 0;

      this.speakingInterval = setInterval(() => {
        if (!this.analyser || this.isMuted || !this.isConnected) {
          if (this.isSpeaking) {
            this.setSpeaking(false);
          }
          return;
        }

        this.analyser.getByteFrequencyData(dataArray);

        // Calculate average volume energy
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;

        // Threshold for human speech vs background hiss
        const THRESHOLD = 14;

        if (avg > THRESHOLD) {
          speakingCounter = Math.min(speakingCounter + 1, 5);
          if (speakingCounter >= 2 && !this.isSpeaking) {
            this.setSpeaking(true);
          }
        } else {
          speakingCounter = Math.max(speakingCounter - 1, 0);
          if (speakingCounter === 0 && this.isSpeaking) {
            this.setSpeaking(false);
          }
        }
      }, 100);
    } catch (err) {
      console.warn('[VoiceService] Could not setup speaking detector:', err);
    }
  }

  private setSpeaking(val: boolean) {
    this.isSpeaking = val;
    this.onSpeakingListeners.forEach((l) => l(val));
    if (this.currentRoomId && this.currentUserId) {
      socketService.emitVoiceState(this.currentRoomId, this.currentUserId, {
        isSpeaking: val,
      });
    }
    this.notifyStateChange();
  }
}

export const voiceService = new VoiceService();
