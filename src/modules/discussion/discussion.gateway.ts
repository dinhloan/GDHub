import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class DiscussionGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    const entryId = client.handshake.query.entryId;
    if (typeof entryId === 'string') {
      client.join(`entry:${entryId}`);
    }
  }

  @SubscribeMessage('join-entry')
  joinEntry(@MessageBody('entryId') entryId: string, @ConnectedSocket() client: Socket) {
    client.join(`entry:${entryId}`);
    return { joined: entryId };
  }

  emitMessage(entryId: string, message: unknown) {
    this.server.to(`entry:${entryId}`).emit('message-created', message);
  }

  emitTopicOverdue(topic: unknown) {
    this.server.emit('topic-overdue', topic);
  }
}
