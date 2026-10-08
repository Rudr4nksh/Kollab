import { socketService } from './socket.ts';

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
  ],
};

interface PeerConnectionData {
  pc: RTCPeerConnection;
  audioEl: HTMLAudioElement;
  pendingCandidates: RTCIceCandidateInit[];
  gainNode?: GainNode;
  audioSource?: MediaStreamAudioSourceNode;
}

class VoiceService {
  private localStream: MediaStream | null = null;
  private peers = new Map<string, PeerConnectionData>();
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private speakingInterval: any = null;
  private removeAutoResume: (() => void) | null = null;

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

      // 1. Initialize and resume AudioContext in user gesture
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.audioContext = new AudioCtx();
        if (this.audioContext.state === 'suspended') {
          await this.audioContext.resume();
        }
      }

      // 2. Request microphone access with echo cancellation & noise suppression
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

      // Ensure all audio tracks are active
      stream.getAudioTracks().forEach((track) => {
        track.enabled = true;
      });

      // 3. Setup volume level speaking detector
      this.setupSpeakingDetector(stream);

      // 4. Setup auto-resume handler for background tabs & autoplay policy
      this.setupAutoResume();

      // 5. Setup WebRTC signal listener
      this.unsubSignal = socketService.onVoiceSignal(async ({ fromUserId, signal }) => {
        await this.handleIncomingSignal(fromUserId, signal);
      });

      // 6. Notify socket server
      socketService.emitVoiceJoin(roomId, userId);

      this.notifyStateChange();
      console.log(`[VoiceService] Successfully joined voice channel for room ${roomId}`);
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

    if (this.removeAutoResume) {
      this.removeAutoResume();
      this.removeAutoResume = null;
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
    this.peers.forEach(({ pc, audioEl, gainNode, audioSource }) => {
      try {
        if (gainNode && audioSource) {
          audioSource.disconnect();
          gainNode.disconnect();
        }
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
    console.log('[VoiceService] Left voice channel');
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
        isSpeaking: this.isMuted ? false : this.isSpeaking,
      });
    }

    this.notifyStateChange();
    return this.isMuted;
  }

  public toggleDeafen(): boolean {
    if (!this.isConnected) return this.isDeafened;

    this.isDeafened = !this.isDeafened;

    // When deafened, mute all remote incoming audio
    this.peers.forEach(({ audioEl, gainNode }) => {
      if (gainNode) {
        gainNode.gain.value = this.isDeafened ? 0 : 1;
      }
      if (!gainNode) {
        audioEl.muted = this.isDeafened;
      }
    });

    // Discord behavior: mutes mic when deafened
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
   * Called when voice member list changes: connects to any new peers
   */
  public syncPeers(voiceUserIds: string[]) {
    if (!this.isConnected || !this.currentUserId) return;

    // Connect to peers that are in voice but not in our peer map
    voiceUserIds.forEach((targetUserId) => {
      if (targetUserId !== this.currentUserId && !this.peers.has(targetUserId)) {
        // Deterministic initiator check: smaller string initiates offer
        if (this.currentUserId! < targetUserId) {
          console.log(`[VoiceService] Initiating WebRTC connection to peer ${targetUserId}`);
          this.initiatePeerConnection(targetUserId);
        }
      }
    });

    // Clean up peers that left
    const currentSet = new Set(voiceUserIds);
    this.peers.forEach(({ pc, audioEl, gainNode, audioSource }, peerId) => {
      if (!currentSet.has(peerId)) {
        try {
          if (gainNode && audioSource) {
            audioSource.disconnect();
            gainNode.disconnect();
          }
          pc.close();
          audioEl.srcObject = null;
          audioEl.remove();
        } catch {
          // ignore
        }
        this.peers.delete(peerId);
        console.log(`[VoiceService] Removed disconnected voice peer ${peerId}`);
      }
    });
  }

  private createPeerConnection(peerId: string): PeerConnectionData {
    const pc = new RTCPeerConnection(RTC_CONFIG);

    // Audio element: in Chromium, this acts as the "pump" element that triggers
    // WebRTCAudioRenderer to pull audio packets continuously into Web Audio.
    // Kept muted so Chromium never blocks it under autoplay policies.
    const audioEl = document.createElement('audio');
    audioEl.autoplay = true;
    audioEl.muted = true;
    audioEl.setAttribute('playsinline', 'true');
    audioEl.setAttribute('data-kollab-peer', peerId);
    audioEl.style.display = 'none';
    document.body.appendChild(audioEl);

    const peerData: PeerConnectionData = {
      pc,
      audioEl,
      pendingCandidates: [],
    };

    // Add local tracks to peer connection immediately
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        pc.addTrack(track, this.localStream!);
      });
    }

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && this.currentRoomId && this.currentUserId) {
        socketService.emitVoiceSignal(this.currentRoomId, peerId, this.currentUserId, {
          candidate: event.candidate.toJSON ? event.candidate.toJSON() : event.candidate,
        });
      }
    };

    // When remote audio track arrives
    pc.ontrack = (event) => {
      console.log(`[VoiceService] Remote audio track received from ${peerId}:`, event.track);
      const stream = event.streams && event.streams[0] ? event.streams[0] : new MediaStream([event.track]);

      // 1. Silent pump element starts the Chromium WebRTC audio pull loop
      audioEl.srcObject = stream;
      audioEl.muted = true;
      audioEl.play().catch((err) => {
        console.warn(`[VoiceService] Pump audio play notice for ${peerId}:`, err);
      });

      // 2. Route audio to Web Audio API speakers
      this.connectRemoteAudioOutput(peerId, stream, peerData);
    };

    pc.onconnectionstatechange = () => {
      console.log(`[VoiceService] Connection state with ${peerId}: ${pc.connectionState}`);
      if (pc.connectionState === 'failed') {
        try {
          pc.restartIce();
        } catch {
          // ignore
        }
      } else if (pc.connectionState === 'disconnected') {
        setTimeout(() => {
          if (pc.connectionState === 'disconnected' || pc.connectionState === 'closed') {
            this.peers.delete(peerId);
            audioEl.remove();
          }
        }, 4000);
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`[VoiceService] ICE state with ${peerId}: ${pc.iceConnectionState}`);
    };

    this.peers.set(peerId, peerData);
    return peerData;
  }

  /**
   * Connects remote audio track to Web Audio API speakers, with HTMLAudioElement fallback
   */
  private connectRemoteAudioOutput(peerId: string, stream: MediaStream, peerData: PeerConnectionData) {
    try {
      if (!this.audioContext || this.audioContext.state === 'closed') {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) this.audioContext = new AudioCtx();
      }

      if (this.audioContext) {
        if (this.audioContext.state === 'suspended') {
          this.audioContext.resume().catch(() => {});
        }

        if (!peerData.gainNode) {
          const remoteSource = this.audioContext.createMediaStreamSource(stream);
          const gainNode = this.audioContext.createGain();
          gainNode.gain.value = this.isDeafened ? 0 : 1.0;
          remoteSource.connect(gainNode);
          gainNode.connect(this.audioContext.destination);

          peerData.audioSource = remoteSource;
          peerData.gainNode = gainNode;
          console.log(`[VoiceService] WebAudio output attached and active for ${peerId}`);
        }
      } else {
        // Fallback: If Web Audio is not available, unmute HTML audio element
        peerData.audioEl.muted = this.isDeafened;
        peerData.audioEl.play().catch(() => {});
      }
    } catch (err) {
      console.warn(`[VoiceService] WebAudio output error, falling back to audio tag for ${peerId}:`, err);
      peerData.audioEl.muted = this.isDeafened;
      peerData.audioEl.play().catch(() => {});
    }
  }

  private setupAutoResume() {
    const resume = () => {
      if (this.audioContext && this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(() => {});
      }
      this.peers.forEach(({ audioEl, gainNode }) => {
        if (audioEl && audioEl.paused) {
          audioEl.play().catch(() => {});
        }
        if (gainNode) {
          gainNode.gain.value = this.isDeafened ? 0 : 1.0;
        }
      });
    };

    window.addEventListener('click', resume, { passive: true });
    window.addEventListener('keydown', resume, { passive: true });

    this.removeAutoResume = () => {
      window.removeEventListener('click', resume);
      window.removeEventListener('keydown', resume);
    };
  }

  private async initiatePeerConnection(targetUserId: string) {
    let peer = this.peers.get(targetUserId);
    if (!peer) {
      peer = this.createPeerConnection(targetUserId);
    }
    const { pc } = peer;

    try {
      // Ensure local tracks are attached to sender
      if (this.localStream) {
        const senders = pc.getSenders();
        this.localStream.getAudioTracks().forEach((track) => {
          if (!senders.some((s) => s.track === track)) {
            pc.addTrack(track, this.localStream!);
          }
        });
      }

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

        // Handle offer collisions cleanly
        if (desc.type === 'offer' && pc.signalingState !== 'stable') {
          console.log(`[VoiceService] Offer collision with ${fromUserId}, signaling state: ${pc.signalingState}`);
          try {
            await pc.setLocalDescription({ type: 'rollback' } as any);
          } catch {
            // ignore rollback failure
          }
        }

        await pc.setRemoteDescription(desc);

        // Drain any buffered ICE candidates received before remote description
        while (pendingCandidates.length > 0) {
          const queuedCand = pendingCandidates.shift();
          if (queuedCand && (queuedCand.candidate || typeof queuedCand === 'string')) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(queuedCand));
            } catch (candErr) {
              console.warn('[VoiceService] Error applying buffered ICE candidate:', candErr);
            }
          }
        }

        if (desc.type === 'offer') {
          // Attach local tracks before creating answer
          if (this.localStream) {
            const senders = pc.getSenders();
            this.localStream.getAudioTracks().forEach((track) => {
              if (!senders.some((s) => s.track === track)) {
                pc.addTrack(track, this.localStream!);
              }
            });
          }

          const answer = await pc.createAnswer({
            offerToReceiveAudio: true,
          });
          await pc.setLocalDescription(answer);

          if (this.currentRoomId && this.currentUserId) {
            socketService.emitVoiceSignal(this.currentRoomId, fromUserId, this.currentUserId, {
              sdp: pc.localDescription,
            });
          }
        }
      } else if (signal.candidate && (signal.candidate.candidate || typeof signal.candidate === 'string')) {
        if (pc.remoteDescription && pc.remoteDescription.type) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
          } catch (err) {
            console.warn('[VoiceService] Error adding incoming candidate:', err);
          }
        } else {
          pendingCandidates.push(signal.candidate);
        }
      }
    } catch (err) {
      console.warn(`[VoiceService] Error handling signal from ${fromUserId}:`, err);
    }
  }

  /**
   * Voice activity level detection using Web Audio API
   */
  private setupSpeakingDetector(stream: MediaStream) {
    try {
      if (!this.audioContext) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) this.audioContext = new AudioCtx();
      }
      if (!this.audioContext) return;

      const source = this.audioContext.createMediaStreamSource(stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.3;
      source.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      let hangoverCount = 0;

      this.speakingInterval = setInterval(() => {
        if (!this.analyser || this.isMuted || !this.isConnected) {
          if (this.isSpeaking) {
            this.setSpeaking(false);
          }
          return;
        }

        this.analyser.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;

        // Threshold for speaking activity
        const THRESHOLD = 8;

        if (avg > THRESHOLD) {
          hangoverCount = 4; // 400ms hangover
          if (!this.isSpeaking) {
            this.setSpeaking(true);
          }
        } else {
          if (hangoverCount > 0) {
            hangoverCount--;
          } else if (this.isSpeaking) {
            this.setSpeaking(false);
          }
        }
      }, 100);
    } catch (err) {
      console.warn('[VoiceService] Could not setup speaking detector:', err);
    }
  }

  private setSpeaking(val: boolean) {
    if (this.isSpeaking === val) return;
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
