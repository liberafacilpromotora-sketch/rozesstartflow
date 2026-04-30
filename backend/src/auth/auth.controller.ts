import { Controller, Post, Body, UseGuards, Get, Patch, Param, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators';
import { IsEmail, IsString, MinLength, IsIn } from 'class-validator';

class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;
}

class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  name: string;
}

class PromoteDto {
  @IsString()
  @IsIn(['master', 'admin', 'client'])
  role: string;
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @Post('register')
  register(@Body() dto: CreateUserDto) {
    return this.authService.createUser(dto.email, dto.password, dto.name);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  me(@Request() req) {
    return req.user;
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('master')
  @Patch('promote/:id')
  promote(@Param('id') id: string, @Body() dto: PromoteDto) {
    return this.authService.promoteUser(id, dto.role);
  }
}
