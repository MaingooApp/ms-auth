import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';

import { AuthSubjects } from 'src/config';
import { AuthService } from './auth.service';
import {
  LoginUserDto,
  ProfileRequestDto,
  RefreshTokenDto,
  RegisterUserDto,
  UpdateUserRequestDto,
  VerifyTokenDto,
} from './dto';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @MessagePattern(AuthSubjects.register)
  register(@Payload() payload: RegisterUserDto) {
    return this.authService.register(payload);
  }

  @MessagePattern(AuthSubjects.login)
  login(@Payload() payload: LoginUserDto) {
    return this.authService.login(payload);
  }

  @MessagePattern(AuthSubjects.refresh)
  refresh(@Payload() payload: RefreshTokenDto) {
    return this.authService.refresh(payload);
  }

  @MessagePattern(AuthSubjects.profile)
  profile(@Payload() payload: ProfileRequestDto) {
    return this.authService.profile(payload);
  }

  @MessagePattern(AuthSubjects.userUpdate)
  userUpdate(@Payload() payload: UpdateUserRequestDto) {
    return this.authService.userUpdate(payload);
  }

  @MessagePattern(AuthSubjects.verify)
  verify(@Payload() payload: VerifyTokenDto) {
    return this.authService.verifyToken(payload);
  }

  @MessagePattern(AuthSubjects.getRoles)
  getRoles() {
    return this.authService.getRoles();
  }

  @MessagePattern(AuthSubjects.health)
  health() {
    return this.authService.health();
  }
}
