import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { type RegisterSpecialistInput, registerSpecialistSchema } from './specialists.dto';
import { SpecialistsService } from './specialists.service';

@ApiTags('specialists')
@Controller('specialists')
export class SpecialistsController {
  constructor(private readonly specialists: SpecialistsService) {}

  @Post()
  register(@Body(new ZodValidationPipe(registerSpecialistSchema)) body: RegisterSpecialistInput) {
    return this.specialists.register(body);
  }
}
