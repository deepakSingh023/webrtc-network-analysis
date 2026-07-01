package com.example.Signalling_server.service;

import com.example.Signalling_server.dto.Room;
import org.springframework.stereotype.Service;
import org.springframework.web.socket.WebSocketSession;

import java.util.Collection;
import java.util.List;
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

    public boolean joinRoom(String roomId,
                            WebSocketSession guest) {

        Room room = rooms.get(roomId);

        if (room == null) {
            return false;
        }

        if (room.getGuest() != null) {
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

    public Collection<Room> getAllActiveRooms() {
        return rooms.values();
    }
    public void removeSession(WebSocketSession session) {

        rooms.entrySet().removeIf(entry -> {

            Room room = entry.getValue();

            if (room.getHost() != null &&
                    room.getHost().getId().equals(session.getId())) {

                System.out.println("Host left room " + room.getRoomId());
                room.setHost(null);
            }

            if (room.getGuest() != null &&
                    room.getGuest().getId().equals(session.getId())) {

                System.out.println("Guest left room " + room.getRoomId());
                room.setGuest(null);
            }

            boolean deleteRoom =
                    room.getHost() == null &&
                            room.getGuest() == null;

            if (deleteRoom) {
                System.out.println("Deleting room " + room.getRoomId());
            }

            return deleteRoom;
        });
    }



}