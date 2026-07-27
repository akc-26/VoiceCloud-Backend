import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtTokenService } from './jwt-token.service';
import { OtpService } from './otp.service';
import { GoogleAuthService } from './google-auth.service';
import { DeviceSessionService } from './device-session.service';
import { User } from '../users/entities/user.entity';
import { UserDevice } from '../users/entities/user-device.entity';
import { UserSession } from '../users/entities/user-session.entity';
import { UserConnectionHistory } from '../users/entities/user-connection-history.entity';
import { OtpVerification } from './entities/otp-verification.entity';
import { AdminModule } from '../admin/admin.module';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      UserDevice,
      UserSession,
      UserConnectionHistory,
      OtpVerification,
    ]),
    JwtModule.register({}),
    AdminModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtTokenService,
    OtpService,
    GoogleAuthService,
    DeviceSessionService,
  ],
  exports: [
    AuthService,
    JwtTokenService,
    DeviceSessionService,
    OtpService,
    GoogleAuthService,
  ],
})
export class AuthModule {}
