import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Usuario } from './usuario.entity';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';

const BCRYPT_ROUNDS = 10;

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuariosRepo: Repository<Usuario>,
  ) {}

  async create(dto: CreateUsuarioDto): Promise<Usuario> {
    const existente = await this.usuariosRepo.findOne({
      where: { email: dto.email },
    });
    if (existente) {
      throw new ConflictException('Ya existe un usuario con ese email');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const nuevo = this.usuariosRepo.create({
      nombre: dto.nombre,
      email: dto.email,
      password: passwordHash,
      rol: dto.rol,
      activo: dto.activo ?? true,
    });

    const guardado = await this.usuariosRepo.save(nuevo);
    return this.sinPassword(guardado);
  }

  async findAll(): Promise<Usuario[]> {
    return this.usuariosRepo.find({
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Usuario> {
    const usuario = await this.usuariosRepo.findOne({ where: { id } });
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return usuario;
  }

  async findByEmailWithPassword(email: string): Promise<Usuario | null> {
    return this.usuariosRepo
      .createQueryBuilder('u')
      .addSelect('u.password')
      .where('u.email = :email', { email })
      .getOne();
  }

  async update(id: string, dto: UpdateUsuarioDto): Promise<Usuario> {
    const usuario = await this.findOne(id);

    if (dto.email && dto.email !== usuario.email) {
      const duplicado = await this.usuariosRepo.findOne({
        where: { email: dto.email },
      });
      if (duplicado) {
        throw new ConflictException('Ya existe un usuario con ese email');
      }
      usuario.email = dto.email;
    }

    if (dto.nombre !== undefined) usuario.nombre = dto.nombre;
    if (dto.rol !== undefined) usuario.rol = dto.rol;
    if (dto.activo !== undefined) usuario.activo = dto.activo;

    if (dto.password) {
      usuario.password = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    }

    const actualizado = await this.usuariosRepo.save(usuario);
    return this.sinPassword(actualizado);
  }

  async remove(id: string): Promise<void> {
    const usuario = await this.findOne(id);
    await this.usuariosRepo.softRemove(usuario);
  }

  private sinPassword(usuario: Usuario): Usuario {
    const clone = { ...usuario } as Partial<Usuario>;
    delete clone.password;
    return clone as Usuario;
  }
}
