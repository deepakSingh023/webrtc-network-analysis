import { useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { peerConnection } from "../service/webrtc";
import { socket } from "../service/websockets";

export function Room(): React.JSX.Element {

    const { roomId } = useParams();

    const localVideoRef =
        useRef<HTMLVideoElement>(null);

    const remoteVideoRef =
        useRef<HTMLVideoElement>(null);



    useEffect(() => {
    // ALWAYS REGISTER THESE
    peerConnection.ontrack = (event) => {

        console.log("Remote stream received");

        if(remoteVideoRef.current){

            remoteVideoRef.current.srcObject =
                event.streams[0];

        }
    };

    peerConnection.onicecandidate = (event) => {

        if(event.candidate){

            socket.send(
                JSON.stringify({
                    type:"ICE_CANDIDATE",
                    roomId,
                    payload:event.candidate
                })
            );

        }
    };

    const setup = async () => {

        try {

            const stream =
                await navigator.mediaDevices.getUserMedia({
                    video:true,
                    audio:true
                });

            if(localVideoRef.current){

                localVideoRef.current.srcObject =
                    stream;

            }

            stream.getTracks().forEach(track => {

                peerConnection.addTrack(
                    track,
                    stream
                );

            });

        } catch(error){

            console.log(
                "No camera, continuing anyway"
            );

        }

    };

    setup();

}, [roomId]);

    useEffect(() => {
    
        socket.onmessage =
            async (event) => {
    
                const data =
                    JSON.parse(
                        event.data
                    );
    
                console.log(data);
    
                switch(data.type){

                    case "PEER_JOINED":

    console.log("STEP 1");

    try {

        console.log("STEP 2");

        const offer =
            await peerConnection
                .createOffer();

        console.log(
            "STEP 3",
            offer
        );

        await peerConnection
            .setLocalDescription(
                offer
            );

        console.log("STEP 4");

        console.log(
    "Socket state",
    socket.readyState
);

console.log(
    "Sending OFFER"
);

socket.send(
    JSON.stringify({
        type:"OFFER",
        roomId,
        payload:offer
    })
);

        console.log("STEP 5");

    } catch(error){

        console.error(
            "OFFER ERROR",
            error
        );

    }

    break;
                
                    case "OFFER":
                
                        console.log(
                            "Offer received"
                        );
                
                        await peerConnection
                            .setRemoteDescription(
                                new RTCSessionDescription(
                                    data.payload
                                )
                            );
                
                        const answer =
                            await peerConnection
                                .createAnswer();
                
                        await peerConnection
                            .setLocalDescription(
                                answer
                            );
                
                        socket.send(
                            JSON.stringify({
                                type:"ANSWER",
                                roomId,
                                payload:answer
                            })
                        );
                        break;
                
                    case "ANSWER":
                
                        console.log(
                            "Answer received"
                        );
                
                        await peerConnection
                            .setRemoteDescription(
                                new RTCSessionDescription(
                                    data.payload
                                )
                            );
                
                        break;
                
                    case "ICE_CANDIDATE":
                
                        console.log(
                            "ICE Candidate received"
                        );
                
                        await peerConnection
                            .addIceCandidate(
                                new RTCIceCandidate(
                                    data.payload
                                )
                            );
                
                        break;
                
                    default:
                
                        console.warn(
                            "Unknown message type",
                            data.type
                        );
                }              
            };
    
    }, [roomId]);

    return (
        <div className="min-h-screen p-6 bg-slate-100">

            <h1 className="text-3xl font-bold mb-6">
                Room {roomId}
            </h1>

            <div className="grid grid-cols-2 gap-4">

                <div>
                    <h2 className="font-semibold mb-2">
                        Local Video
                    </h2>

                    <video
                        ref={localVideoRef}
                        autoPlay
                        muted
                        playsInline
                        className="w-full rounded-lg bg-black"
                    />
                </div>

                <div>
                    <h2 className="font-semibold mb-2">
                        Remote Video
                    </h2>

                    <video
                        ref={remoteVideoRef}
                        autoPlay
                        playsInline
                        className="w-full rounded-lg bg-black"
                    />
                </div>

            </div>

        </div>
    );
}