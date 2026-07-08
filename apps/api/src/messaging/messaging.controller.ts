import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { type AuthedRequest, JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  type BlockUserInput,
  blockUserSchema,
  type SendMessageInput,
  sendMessageSchema,
  type StartConversationInput,
  startConversationSchema,
} from './messaging.dto';
import { MessagingService } from './messaging.service';

// EK Z.1 — DM mesajlaşma (tüm uçlar giriş zorunlu)
@ApiTags('messaging')
@Controller('messaging')
@UseGuards(JwtAuthGuard)
export class MessagingController {
  constructor(private readonly messaging: MessagingService) {}

  @Get('conversations')
  conversations(@Req() req: AuthedRequest) {
    return this.messaging.conversations(req.user!.id);
  }

  @Post('conversations')
  start(
    @Req() req: AuthedRequest,
    @Body(new ZodValidationPipe(startConversationSchema)) body: StartConversationInput,
  ) {
    return this.messaging.startConversation(req.user!.id, req.user!.role, body.targetUserId, {
      bookingId: body.bookingId,
      requestId: body.requestId,
    });
  }

  @Get('conversations/:id/messages')
  messages(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.messaging.messages(req.user!.id, id);
  }

  @Post('conversations/:id/messages')
  send(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(sendMessageSchema)) body: SendMessageInput,
  ) {
    return this.messaging.sendMessage(req.user!.id, id, body.body);
  }

  @Get('blocks')
  blocks(@Req() req: AuthedRequest) {
    return this.messaging.blockedList(req.user!.id);
  }

  @Post('blocks')
  block(
    @Req() req: AuthedRequest,
    @Body(new ZodValidationPipe(blockUserSchema)) body: BlockUserInput,
  ) {
    return this.messaging.block(req.user!.id, body.targetUserId);
  }

  @Post('blocks/:targetUserId/remove')
  unblock(@Req() req: AuthedRequest, @Param('targetUserId') targetUserId: string) {
    return this.messaging.unblock(req.user!.id, targetUserId);
  }
}
