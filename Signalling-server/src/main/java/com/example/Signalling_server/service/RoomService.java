package com.example.Signalling_server.service;

import com.example.Signalling_server.dto.Room;
import org.springframework.stereotype.Service;
import org.springframework.web.socket.WebSocketSession;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class RoomService {

    private final Map<String, Room> rooms =
            new ConcurrentHashMap<>();


    public String createRoom(
                WebSocketSession host
    ){
        String roomId = UUID.randomUUID().toString().substring(0,6);

        Room room =
                new Room(roomId, host);

        rooms.put(roomId,room);

        return roomId;

    }

    public boolean joinRoom(
            String roomId,
            WebSocketSession guest
    ){
        Room room = rooms.get(roomId);

        if (room == null){
            return false;
        }

        room.setGuest(guest);

        return true;
    }

    public Room getRoom(
            String roomId
    ) {
        return rooms.get(roomId);
    }



}