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



    /**
     * REFACTORING NOTE: Legacy "BYE" Architecture and Frontend State Workaround

     * HISTORY OF THE COMPONENT:
     * This complex handshaking loop was initially created by mistake under an over-engineered
     * assumption about room management. Once deployed, we realized that for a simple 1-on-1 call,
     * it would be far simpler to just destroy the entire room object and forcefully sever all socket
     * descriptors the moment either user left.

     * WHY WE DID NOT SCRAP IT (THE CRITICAL FRONTEND TRAP):
     * Despite being overly verbose, we deliberately chose to keep this "BYE" mechanism because
     * it accidentally solved a fatal WebRTC architectural limitation on our frontend:

     * 1. WebRTC Peer Connections are strictly non-reusable once an initial negotiation completes.
     *    If we simply vaporized the room on the backend, the user left behind would stay stuck
     *    in an active, stale connection state, waiting for media tracks from a dead session.
     * 2. Because our 1-on-1 frontend is currently unable to dynamically unbind, tear down, and
     *    re-map a fresh peer connection instance to a *new* participant on the fly while staying
     *    in the same room view, the old session completely blocks any new users from connecting.

     * HOW THE ACCIDENTAL LOOP SAFELY RESOLVES THIS:
     * Instead of rewrite-refactoring our entire network state mapping, this legacy flow acts as
     * a perfect safety net. User A leaves -> Backend sends a "BYE" eviction notice to User B ->
     * User B catches the signal and runs `window.location.href = "/"`.

     * This hard redirect forces the frontend to unmount, which is the only way our app currently
     * stops camera hardware, closes ports, and kills the dead reference objects. Once User B is
     * kicked out, their socket drops violently, tripping the fallback loop which cleanly wipes the
     * room out of the ConcurrentHashMap anyway.

     * TL;DR: It is not the most graceful or shortest way to code a teardown, but it functions
     * flawlessly under network drops and manual hang-ups, so we are keeping it as is.
     */


    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {

        Boolean byeAlreadySent = (Boolean) session.getAttributes().getOrDefault("BYE_SENT", false);

        if (!byeAlreadySent) {
            System.out.println("Tab closed violently. Running O(N) fallback loop...");
            for (Room room : roomService.getAllActiveRooms()) {
                if (room.getHost() != null && room.getHost().getId().equals(session.getId())) {
                    if (room.getGuest() != null && room.getGuest().isOpen()) {
                        send(room.getGuest(), new SignalMessage("BYE", room.getRoomId(), null));
                    }
                    break;
                } else if (room.getGuest() != null && room.getGuest().getId().equals(session.getId())) {
                    if (room.getHost() != null && room.getHost().isOpen()) {
                        send(room.getHost(), new SignalMessage("BYE", room.getRoomId(), null));
                    }
                    break;
                }
            }
            // Centralized memory cleanup
            roomService.removeSession(session);
        } else {
            System.out.println("Connection closed via button. Bypassing fallback loop safely.");
        }
    }


    private void handleEndCall(WebSocketSession session, SignalMessage msg) throws Exception {
        Room room = roomService.getRoom(msg.roomId());
        if (room != null) {
            if (session.getId().equals(room.getHost().getId()) && room.getGuest() != null) {
                send(room.getGuest(), new SignalMessage("BYE", msg.roomId(), null));
            } else if (room.getGuest() != null && session.getId().equals(room.getGuest().getId()) && room.getHost() != null) {
                send(room.getHost(), new SignalMessage("BYE", msg.roomId(), null));
            }

            roomService.removeSession(session);
        }

        session.getAttributes().put("BYE_SENT", true);

        session.close();
    }



}