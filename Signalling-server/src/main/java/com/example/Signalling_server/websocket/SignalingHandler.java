package com.example.Signalling_server.websocket;

import com.example.Signalling_server.dto.Room;
import com.example.Signalling_server.dto.SignalMessage;
import com.example.Signalling_server.service.RoomService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.*;
import org.springframework.web.socket.handler.TextWebSocketHandler;

@Component
@RequiredArgsConstructor
public class SignalingHandler extends TextWebSocketHandler {

    private final RoomService roomService;

    private final ObjectMapper mapper;

    @Override
    protected void handleTextMessage(
            WebSocketSession session,
            TextMessage message
    ) throws Exception {

        SignalMessage msg =
                mapper.readValue(
                        message.getPayload(),
                        SignalMessage.class
                );

        System.out.println(
                "Received : " + msg.type()
        );

        switch (msg.type()) {

            case "CREATE_ROOM" -> handleCreateRoom(session);

            case "JOIN_ROOM" -> handleJoinRoom(
                    session,
                    msg
            );

            case "OFFER",
                 "ANSWER",
                 "ICE_CANDIDATE" -> relayMessage(
                    session,
                    msg
                 );
            case "END_CALL" -> handleEndCall(session, msg);
        }
    }

    private void handleCreateRoom(
            WebSocketSession session
    ) throws Exception {

        String roomId =
                roomService.createRoom(
                        session
                );

        send(
                session,
                new SignalMessage(
                        "ROOM_CREATED",
                        roomId,
                        null
                )
        );
    }

    private void handleJoinRoom(
            WebSocketSession session,
            SignalMessage msg
    ) throws Exception {

        boolean joined =
                roomService.joinRoom(
                        msg.roomId(),
                        session
                );

        send(
                session,
                new SignalMessage(
                        joined
                                ? "JOIN_SUCCESS"
                                : "JOIN_FAILED",
                        msg.roomId(),
                        null
                )
        );

        if (!joined) {
            return;
        }

        Room room =
                roomService.getRoom(
                        msg.roomId()
                );

        if (room == null) {
            return;
        }

        send(
                room.getHost(),
                new SignalMessage(
                        "PEER_JOINED",
                        msg.roomId(),
                        null
                )
        );
    }

    private void relayMessage(
            WebSocketSession sender,
            SignalMessage msg
    ) throws Exception {

        Room room =
                roomService.getRoom(
                        msg.roomId()
                );

        if (room == null) {
            return;
        }

        WebSocketSession target =
                getTarget(
                        room,
                        sender
                );

        if (target == null) {
            return;
        }

        System.out.println(
                "Relaying : " + msg.type()
        );

        send(
                target,
                msg
        );
    }

    private void send(
            WebSocketSession session,
            SignalMessage message
    ) throws Exception {

        if(session == null || !session.isOpen()){
            return;
        }

        session.sendMessage(
                new TextMessage(
                        mapper.writeValueAsString(
                                message
                        )
                )
        );
    }

    private WebSocketSession getTarget(
            Room room,
            WebSocketSession sender
    ) {

        if (room == null) {
            return null;
        }

        if (
                room.getHost() != null
                        &&
                        sender.getId().equals(
                                room.getHost().getId()
                        )
        ) {
            return room.getGuest();
        }

        return room.getHost();
    }

    @Override
    public void afterConnectionEstablished(
            WebSocketSession session
    ) {

        System.out.println(
                "Connected : "
                        + session.getId()
        );
    }

    @Override
    public void afterConnectionClosed(
            WebSocketSession session,
            CloseStatus status
    ) {

        System.out.println(
                "Disconnected : " + session.getId()
        );

        roomService.removeSession(session);
    }

    private void handleEndCall(
            WebSocketSession session,
            SignalMessage msg
    ) {
        try {
            session.close();
        } catch (Exception ignored) {}
    }
}