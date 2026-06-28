import { useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { createPeerConnection } from "../service/webrtc";
import { socket } from "../service/websockets";

export function Room(): React.JSX.Element {


    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

    
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
    stream.getAudioTracks().forEach(track => {
        track.enabled = isAudioEnabled.current;
    });
    console.log(`Mic active state: ${isAudioEnabled.current}`);
};




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
        socket.onmessage = null; 
    };

}, [roomId, peerConnection]); // 👈 Only ONE unified hook tracking the lifecycle


return (
    <div className="min-h-screen p-4 md:p-6 bg-slate-100">

        <h1 className="text-2xl md:text-3xl font-bold mb-4 text-slate-800">
            Room {roomId}
        </h1>

        {/* 🌟 Responsive Control Buttons Group */}
        <div className="flex flex-wrap gap-3 mb-6 max-w-6xl mx-auto">
            <button 
                onClick={toggleVideo} 
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow-md hover:bg-blue-700 active:scale-95 transition-all duration-150"
            >
                Toggle Camera
            </button>
            <button 
                onClick={toggleAudio} 
                className="px-4 py-2 text-sm font-semibold text-white bg-slate-700 rounded-lg shadow-md hover:bg-slate-800 active:scale-95 transition-all duration-150"
            >
                Toggle Mic
            </button>
        </div>

        {/* 🌟 Responsive Video Grid */}
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