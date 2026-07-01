import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { createPeerConnection } from "../service/webrtc";
import { socket } from "../service/websockets";

export function Room(): React.JSX.Element {


    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

   const peerDataType = useRef<"LOCAL" | "REMOTE" | null>(null);


    
    if (!peerConnectionRef.current) {
        peerConnectionRef.current = createPeerConnection();
    }
    
    const peerConnection = peerConnectionRef.current;

    const { roomId } = useParams();

    const localVideoRef =
        useRef<HTMLVideoElement>(null);

    const remoteVideoRef =
        useRef<HTMLVideoElement>(null);
        

    const isMediaReady = useRef(false);

    const iceCandidatesQueue = useRef<RTCIceCandidateInit[]>([]);

    const [mute,setMute] = useState(false);

    const [video,setVideo] = useState(true);  



    const processQueuedCandidates = async () => {
    
        while (iceCandidatesQueue.current.length > 0) {

            const candidate = iceCandidatesQueue.current.shift();
            if (candidate) {
                try {
                    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
                    console.log("Successfully processed a queued ICE Candidate!");
                } catch (e) {
                    console.error("Failed to add queued candidate:", e);
                }
            }
        }
    };

    const isVideoEnabled = useRef(true);
    const isAudioEnabled = useRef(true);

   
    const toggleVideo = () => {
        const stream = localVideoRef.current?.srcObject as MediaStream;
        if (!stream) {
            console.warn("No active camera stream found to toggle.");
            return;
        }
    
        isVideoEnabled.current = !isVideoEnabled.current;
        setVideo(prev => !prev);
        stream.getVideoTracks().forEach(track => {
            track.enabled = isVideoEnabled.current;
        });
        console.log(`Camera active state: ${isVideoEnabled.current}`);
    };

    const toggleAudio = () => {
        const stream = localVideoRef.current?.srcObject as MediaStream;
        if (!stream) {
            console.warn("No active mic stream found to toggle.");
            return;
        }
    
        isAudioEnabled.current = !isAudioEnabled.current;
        setMute(prev => !prev);
        stream.getAudioTracks().forEach(track => {
            track.enabled = isAudioEnabled.current;
        });
        console.log(`Mic active state: ${isAudioEnabled.current}`);
    };

    const endCall = () =>{
        socket.send(
            JSON.stringify(
                {
                    type: "END_CALL",
                    roomId: roomId,
                    payload: null

                }
            ) 
        )

        peerConnection.close();

        window.location.href = "/"; 
    }

    const collectAndSendMetrics = async () => {
    if (!peerDataType.current || !peerConnection) return;

    try {
        const stats = await peerConnection.getStats();
        
        // Base payload structure matching your Java Record properties exactly
        let metrics = {
            elapsedTime: 0, // Calculated autonomously by your Java server
            rtt: 0,
            jitter: 0,
            packetsLost: 0,
            packetsSent: 0,
            packetsReceived: 0,
            bytesSent: 0,
            bytesReceived: 0,
            availableOutgoingBitrate: 0,
            availableIncomingBitrate: 0,
            fps: 30.0,       // Default baselines if media layer hasn't initialized
            framesDropped: 0,
            type: peerDataType.current // Passes your "LOCAL" or "REMOTE" enum string
        };

        stats.forEach((report) => {
            // 1. Core Latency Layer (Directional)
            if (report.type === "remote-inbound-rtp") {
                metrics.rtt = (report.roundTripTime || 0) * 1000; // Convert to milliseconds
                metrics.jitter = report.jitter || 0;
                metrics.packetsLost = report.packetsLost || 0;
            }
            
            // 2. Outbound Flow Throughput
            if (report.type === "outbound-rtp") {
                metrics.packetsSent += report.packetsSent || 0;
                metrics.bytesSent += report.bytesSent || 0;
                if (report.framesPerSecond) metrics.fps = report.framesPerSecond;
            }

            // 3. Inbound Flow Quality of Experience (QoE)
            if (report.type === "inbound-rtp") {
                metrics.packetsReceived += report.packetsReceived || 0;
                metrics.bytesReceived += report.bytesReceived || 0;
                metrics.framesDropped += report.framesDropped || 0;
            }

            // 4. Bandwidth Estimation (Google Congestion Control / BBR Metrics)
            if (report.type === "candidate-pair" && report.state === "succeeded") {
                metrics.availableOutgoingBitrate = report.availableOutgoingBitrate || 0;
                metrics.availableIncomingBitrate = report.availableIncomingBitrate || 0;
            }
        });

        // POST the metrics directly to your running Spring Boot Controller
        await fetch(`http://localhost:8080/api/experiment/update?roomId=${roomId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(metrics)
        });
        
        console.log(`>>> Telemetry logged for: ${peerDataType.current}`);

        } catch (error) {
        console.error("Failed to compile WebRTC stats metrics:", error);
        }
    };

    useEffect(() => {
        console.log("Telemetry lifecycle monitoring initialized.");
    
        // 🌟 1. The 10-Second Metrics Interval Loop
        const telemetryInterval = setInterval(() => {
            // Only start sending once the media handshake finishes and our role is set
            if (isMediaReady.current && peerDataType.current) {
                collectAndSendMetrics();
            }
        }, 10000);
    
        // 🌟 2. The 5-Minute (300,000ms) Auto-Kill Timer
        const callDurationTimeout = setTimeout(() => {
            if (isMediaReady.current) {
                console.log("=== 5-Minute Mark Reached. Auto-Terminating Experiment ===");
                alert("Experiment window complete. Terminating connection.");
                endCall(); // Calls your existing safe endCall method to exit cleanly
            }
        }, 300000); 
    
        // 🌟 3. Clean up timers if a user clicks "End Call" manually before 5 minutes are up
        return () => {
            clearInterval(telemetryInterval);
            clearTimeout(callDurationTimeout);
            console.log("Telemetry and timeout monitors cleared out.");
        };
    }, [roomId]);






    useEffect(() => {
        // 1. REGISTER PEER LISTENERS IMMEDIATELY
        peerConnection.ontrack = (event) => {
            console.log("Remote stream received");
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = event.streams[0];
            }
        };
    
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                socket.send(
                    JSON.stringify({
                        type: "ICE_CANDIDATE",
                        roomId,
                        payload: event.candidate
                    })
                );
            }
        };
    
        // 2. UNIFIED WEB SOCKET LISTENER
        socket.onmessage = async (event) => {
            const data = JSON.parse(event.data);
            console.log("Incoming WebSocket Message:", data.type);
    
            switch (data.type) {
                case "PEER_JOINED":
    
    
                    if (!isMediaReady.current) {
                        console.warn("Peer joined too fast! Camera not ready.");
                        break;
                    }
    
                    peerDataType.current = "LOCAL"; 
    
                    try {
                        const offer = await peerConnection.createOffer();
                        await peerConnection.setLocalDescription(offer);
                        socket.send(
                            JSON.stringify({
                                type: "OFFER",
                                roomId,
                                payload: offer
                            })
                        );
                    } catch (error) {
                        console.error("OFFER ERROR", error);
                    }
                    break;
    
                case "OFFER":
                    console.log("Offer received");
    
                    peerDataType.current = "REMOTE";
    
                    try {
                        await peerConnection.setRemoteDescription(data.payload);
                        await processQueuedCandidates();
    
                        const answer = await peerConnection.createAnswer();
                        await peerConnection.setLocalDescription(answer);
    
                        socket.send(
                            JSON.stringify({
                                type: "ANSWER",
                                roomId,
                                payload: answer
                            })
                        );
                    } catch (error) {
                        console.error("Error handling offer:", error);
                    }
                    break;
    
                case "ANSWER":
                    console.log("Answer received");
                    try {
                        await peerConnection.setRemoteDescription(data.payload);
                        await processQueuedCandidates();
                    } catch (error) {
                        console.error("Error handling answer:", error);
                    }
                    break;
    
                case "ICE_CANDIDATE":
                    console.log("ICE Candidate received");
                    if (!peerConnection.remoteDescription) {
                        console.warn("Remote description not ready yet. Queueing candidate.");
                        iceCandidatesQueue.current.push(data.payload);
                        break;
                    }
                    try {
                        await peerConnection.addIceCandidate(new RTCIceCandidate(data.payload));
                    } catch (error) {
                        console.error("Error adding candidate:", error);
                    }
                    break;
    
                case "BYE":
                    console.log("Peer has left the room.");
                    
                    if(remoteVideoRef.current ){
                        remoteVideoRef.current.srcObject = null;
                    }
    
                    peerConnection.close();
                    
                    window.location.href = "/";
    
                    alert("The other participant has left the call.");
                    break;
    
                default:
                    console.warn("Unknown message type", data.type);
            }
        };
    
        // 3. RUN ASYNC CAMERA SETUP LAST
        const setup = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: true
                });
    
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = stream;
                }
    
                stream.getTracks().forEach(track => {
                    peerConnection.addTrack(track, stream);
                });
    
                isMediaReady.current = true;
            } catch (error) {
                console.warn("No camera/mic access, running in RECEIVE-ONLY mode.");
                isMediaReady.current = true;
            }
        };
    
        setup();
    
        // 4. CLEANUP ON DISCONNECT
        return () => {
    
            console.log("Cleaning up resources...");
    
            const stream = localVideoRef.current?.srcObject as MediaStream;
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        
    
            peerConnection.close();
            peerConnectionRef.current = null; 
    
            socket.onmessage = null; 
        };
    
    }, [roomId, peerConnection]); 


return (
    <div className="min-h-screen p-4 md:p-6 bg-slate-100">

        <h1 className="text-2xl md:text-3xl font-bold mb-4 text-slate-800">
            Room {roomId}
        </h1>

        {/* 🌟 Action Control Buttons Group */}
        <div className="flex flex-wrap gap-3 mb-6 max-w-6xl mx-auto">
            <button
                onClick={toggleVideo}
                className={`px-4 py-2 text-sm font-semibold text-white rounded-lg shadow-md active:scale-95 transition-all duration-150 ${
                    video
                        ? "bg-blue-600 hover:bg-blue-700"
                        : "bg-red-600 hover:bg-red-700"
                }`}
            >
                {video ? "Turn Camera Off" : "Turn Camera On"}
            </button>
            <button
                onClick={toggleAudio}
                className={`px-4 py-2 text-sm font-semibold text-white rounded-lg shadow-md active:scale-95 transition-all duration-150 ${
                    mute
                        ? "bg-red-600 hover:bg-red-700"
                        : "bg-green-600 hover:bg-green-700"
                }`}
            >
                {mute ? "Unmute Mic" : "Mute Mic"}
            </button>
            
            {/* 🌟 THE ADDITION: High-Visibility, Responsive End Call Button */}
            <button
                onClick={endCall}
                className="px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-md active:scale-95 hover:shadow-lg transition-all duration-150 flex items-center gap-2 border border-rose-500/20"
            >
                {/* Minimalist Phone Hanging Up Emoji Sub-Anchor */}
                📞 End Call
            </button>
        </div>

        {/* Responsive Video Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-6xl mx-auto">

            <div className="flex flex-col">
                <h2 className="font-semibold mb-2 text-slate-700 text-sm md:text-base">
                    Local Video
                </h2>

                <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-auto aspect-video rounded-xl bg-black shadow-md object-cover"
                />
            </div>

            <div className="flex flex-col">
                <h2 className="font-semibold mb-2 text-slate-700 text-sm md:text-base">
                    Remote Video
                </h2>

                <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-auto aspect-video rounded-xl bg-black shadow-md object-cover"
                />
            </div>

        </div>

    </div>
);

}