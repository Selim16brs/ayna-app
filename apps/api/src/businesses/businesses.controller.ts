import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { AdminGuard } from '../common/admin.guard';
import { type AuthedRequest, JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  type RegisterBusinessInput,
  registerBusinessSchema,
  type RejectInput,
  rejectSchema,
} from './businesses.dto';
import { BusinessesService } from './businesses.service';

@ApiTags('businesses')
@Controller('businesses')
export class BusinessesController {
  constructor(private readonly businesses: BusinessesService) {}

  @Post()
  register(@Body(new ZodValidationPipe(registerBusinessSchema)) body: RegisterBusinessInput) {
    return this.businesses.register(body);
  }

  @Get()
  list() {
    return this.businesses.listApproved();
  }

  @Get('searchable')
  searchable() {
    return this.businesses.searchable();
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  mine(@Req() req: AuthedRequest) {
    return this.businesses.mine(req.user!.id);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.businesses.get(id);
  }

  @Post(':id/invite-codes')
  @UseGuards(JwtAuthGuard)
  createCode(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.businesses.createInviteCode(id, req.user!.id);
  }

  @Get(':id/invite-codes')
  @UseGuards(JwtAuthGuard)
  listCodes(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.businesses.listInviteCodes(id, req.user!.id);
  }

  @Post(':id/invite-codes/:codeId/revoke')
  @UseGuards(JwtAuthGuard)
  revokeCode(@Param('id') id: string, @Param('codeId') codeId: string, @Req() req: AuthedRequest) {
    return this.businesses.revokeInviteCode(id, codeId, req.user!.id);
  }

  @Post(':id/approve')
  @UseGuards(AdminGuard)
  approve(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.businesses.approve(id, req.user!.id);
  }

  @Post(':id/reject')
  @UseGuards(AdminGuard)
  reject(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(rejectSchema)) body: RejectInput,
    @Req() req: AuthedRequest,
  ) {
    return this.businesses.reject(id, body.reason, req.user!.id);
  }
}
