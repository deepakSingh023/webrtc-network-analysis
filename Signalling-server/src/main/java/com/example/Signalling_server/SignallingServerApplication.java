package com.example.Signalling_server;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.socket.config.annotation.EnableWebSocket;


@EnableWebSocket
@SpringBootApplication
public class SignallingServerApplication {

	public static void main(String[] args) {
		SpringApplication.run(SignallingServerApplication.class, args);
	}

}
