import { Module } from '@nestjs/common';
import { ProfileChangesAdminController } from './profile-changes-admin.controller';
import { ProfileChangesController } from './profile-changes.controller';
import { ProfileChangesService } from './profile-changes.service';

@Module({
  controllers: [ProfileChangesController, ProfileChangesAdminController],
  providers: [ProfileChangesService],
})
export class ProfileChangesModule {}
