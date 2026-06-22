import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { socket } from "../service/websockets";

export function Home(): React.JSX.Element {

    const[roomId, setRoomId] = useState("");
    const navigate = useNavigate();
  
  useEffect(() => {

    socket.onmessage = (event) => {

        const data =
            JSON.parse(event.data);

        console.log(data);

        switch(data.type){

            case "ROOM_CREATED":

                navigate(
                    `/room/${data.roomId}`
                );

                break;

            case "JOIN_SUCCESS":

                navigate(
                    `/room/${data.roomId}`
                );

                break;

            case "JOIN_FAILED":

                alert("Room not found");

                break;
        }

    };

}, [navigate]);

  const createRoom = () =>{

    if(socket.readyState !== WebSocket.OPEN){
        return;
    }

    socket.send(
      JSON.stringify({
        type: "CREATE_ROOM",
        roomId: null,
        payload: null,
      })
    );
  }
  

  const joinRoom = (roomId: string) => {

    if(socket.readyState !== WebSocket.OPEN){
        return;
    }

    socket.send(
        JSON.stringify({
            type: "JOIN_ROOM",
            roomId,
            payload: null,
        })
    );
};



  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center">

      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">

        <h1 className="text-3xl font-bold text-center mb-2">
          WebRTC Network Analysis
        </h1>

        <p className="text-center text-gray-500 mb-8">
          Create a room or join an existing session
        </p>

        <div className="flex flex-col gap-4">

          <button
            className="w-full bg-black text-white py-3 rounded-lg hover:opacity-90 transition"
            onClick={createRoom}
          >
            Create Room
          </button>

          <div className="flex items-center gap-3">
            <div className="h-px bg-gray-300 flex-1" />
            <span className="text-gray-500 text-sm">
              OR
            </span>
            <div className="h-px bg-gray-300 flex-1" />
          </div>

          <input
            type="text"
            placeholder="Enter Room ID"
            className="border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-black"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
          />

          <button
            className="w-full border border-black py-3 rounded-lg hover:bg-black hover:text-white transition"
            onClick={() => joinRoom(roomId)}
          >
            Join Room
          </button>

        </div>

      </div>

    </div>
  );
}