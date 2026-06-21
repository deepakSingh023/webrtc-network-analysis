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
public class SignalingHandler
        extends TextWebSocketHandler {

    private final RoomService roomService;

    private final ObjectMapper mapper =
            new ObjectMapper();

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

        switch (msg.type()) {

            case "CREATE_ROOM" -> {

                String roomId =
                        roomService.createRoom(
                                session
                        );

                SignalMessage response =
                        new SignalMessage(
                                "ROOM_CREATED",
                                roomId,
                                null
                        );

                session.sendMessage(
                        new TextMessage(
                                mapper.writeValueAsString(
                                        response
                                )
                        )
                );
            }

            case "JOIN_ROOM" -> {

                boolean joined =
                        roomService.joinRoom(
                                msg.roomId(),
                                session
                        );

                SignalMessage response =
                        new SignalMessage(
                                joined
                                        ? "JOIN_SUCCESS"
                                        : "JOIN_FAILED",
                                msg.roomId(),
                                null
                        );

                session.sendMessage(
                        new TextMessage(
                                mapper.writeValueAsString(
                                        response
                                )
                        )
                );

                Room room =
                        roomService.getRoom(
                                msg.roomId()
                        );

                WebSocketSession host =
                        room.getHost();

                SignalMessage peerJoined =
                        new SignalMessage(
                                "PEER_JOINED",
                                msg.roomId(),
                                null
                        );

                host.sendMessage(
                        new TextMessage(
                                mapper.writeValueAsString(
                                        peerJoined
                                )
                        )
                );
            }
        }
    }


}