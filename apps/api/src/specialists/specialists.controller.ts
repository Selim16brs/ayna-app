import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { type AuthedRequest, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { type RegisterSpecialistInput, registerSpecialistSchema } from './specialists.dto';
import { SpecialistsService } from './specialists.service';
import {
  type AvailabilityInput,
  availabilitySchema,
  type BlockInput,
  blockSchema,
} from './calendar.dto';
import { CalendarService } from './calendar.service';

@ApiTags('specialists')
@Controller('specialists')
export class SpecialistsController {
  constructor(
    private readonly specialists: SpecialistsService,
    private readonly calendar: CalendarService,
  ) {}

  @Post()
  register(@Body(new ZodValidationPipe(registerSpecialistSchema)) body: RegisterSpecialistInput) {
    return this.specialists.register(body);
  }

  // --- Takvim: müsaitlik (uzman kendi profili) ---
  @Get('me/availability')
  @UseGuards(JwtAuthGuard)
  getAvailability(@Req() req: AuthedRequest) {
    return this.calendar.getAvailability(req.user!.id);
  }

  @Put('me/availability')
  @UseGuards(JwtAuthGuard)
  setAvailability(
    @Req() req: AuthedRequest,
    @Body(new ZodValidationPipe(availabilitySchema)) body: AvailabilityInput,
  ) {
    return this.calendar.setAvailability(req.user!.id, body);
  }

  // --- Offline bloklar (§2.2 çakışma önleme) ---
  @Get('me/blocks')
  @UseGuards(JwtAuthGuard)
  listBlocks(@Req() req: AuthedRequest) {
    return this.calendar.listBlocks(req.user!.id);
  }

  @Post('me/blocks')
  @UseGuards(JwtAuthGuard)
  addBlock(@Req() req: AuthedRequest, @Body(new ZodValidationPipe(blockSchema)) body: BlockInput) {
    return this.calendar.addBlock(req.user!.id, body);
  }

  @Delete('me/blocks/:id')
  @UseGuards(JwtAuthGuard)
  deleteBlock(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.calendar.deleteBlock(req.user!.id, id);
  }

  // --- Müsait saatler (randevu akışı §1.5) ---
  @Get(':id/slots')
  slots(@Param('id') id: string, @Query('date') date: string) {
    return this.calendar.slots(id, date);
  }
}
