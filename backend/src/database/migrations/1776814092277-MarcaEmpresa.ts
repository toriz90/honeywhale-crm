import { MigrationInterface, QueryRunner } from 'typeorm';

export class MarcaEmpresa1776814092277 implements MigrationInterface {
  name = 'MarcaEmpresa1776814092277';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // === Bloque "Marca / Empresa" en la tabla configuracion =============
    await queryRunner.query(`
      ALTER TABLE \`configuracion\`
        ADD COLUMN \`nombre_tienda\` VARCHAR(120) NULL DEFAULT 'HoneyWhale',
        ADD COLUMN \`telefono_tienda\` VARCHAR(40) NULL DEFAULT '+52 55 3069 2957',
        ADD COLUMN \`email_contacto\` VARCHAR(255) NULL DEFAULT 'hola@honeywhale.com.mx',
        ADD COLUMN \`direccion_tienda\` VARCHAR(255) NULL,
        ADD COLUMN \`rfc_tienda\` VARCHAR(20) NULL,
        ADD COLUMN \`logo_url\` VARCHAR(500) NULL
    `);

    // Garantiza que la fila existente (id=1) quede con valores reales y no
    // dependa del DEFAULT del ALTER (que sólo aplica a INSERTs futuros).
    await queryRunner.query(`
      UPDATE \`configuracion\`
         SET \`nombre_tienda\` = 'HoneyWhale',
             \`telefono_tienda\` = '+52 55 3069 2957',
             \`email_contacto\` = 'hola@honeywhale.com.mx'
       WHERE \`id\` = 1
    `);

    // === Migrar plantillas: {{telefono_agente}} → {{telefono_tienda}} ===
    // Las 6 plantillas seed (y cualquiera creada por agentes) usaban
    // {{telefono_agente}} pero casi nadie lo llena. Lo mejor es centralizar
    // en {{telefono_tienda}}. El alias {{telefono_agente}} sigue funcionando
    // a nivel de RenderizadoService por retrocompat.
    await queryRunner.query(`
      UPDATE \`plantillas_correo\`
         SET \`asunto\` = REPLACE(\`asunto\`, '{{telefono_agente}}', '{{telefono_tienda}}'),
             \`cuerpo_html\` = REPLACE(\`cuerpo_html\`, '{{telefono_agente}}', '{{telefono_tienda}}'),
             \`cuerpo_texto\` = REPLACE(\`cuerpo_texto\`, '{{telefono_agente}}', '{{telefono_tienda}}')
       WHERE \`asunto\` LIKE '%{{telefono_agente}}%'
          OR \`cuerpo_html\` LIKE '%{{telefono_agente}}%'
          OR \`cuerpo_texto\` LIKE '%{{telefono_agente}}%'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revertir la sustitución en plantillas (best effort — sólo afecta a las
    // que aún tengan {{telefono_tienda}} introducido por la up()).
    await queryRunner.query(`
      UPDATE \`plantillas_correo\`
         SET \`asunto\` = REPLACE(\`asunto\`, '{{telefono_tienda}}', '{{telefono_agente}}'),
             \`cuerpo_html\` = REPLACE(\`cuerpo_html\`, '{{telefono_tienda}}', '{{telefono_agente}}'),
             \`cuerpo_texto\` = REPLACE(\`cuerpo_texto\`, '{{telefono_tienda}}', '{{telefono_agente}}')
       WHERE \`asunto\` LIKE '%{{telefono_tienda}}%'
          OR \`cuerpo_html\` LIKE '%{{telefono_tienda}}%'
          OR \`cuerpo_texto\` LIKE '%{{telefono_tienda}}%'
    `);

    await queryRunner.query(`
      ALTER TABLE \`configuracion\`
        DROP COLUMN \`logo_url\`,
        DROP COLUMN \`rfc_tienda\`,
        DROP COLUMN \`direccion_tienda\`,
        DROP COLUMN \`email_contacto\`,
        DROP COLUMN \`telefono_tienda\`,
        DROP COLUMN \`nombre_tienda\`
    `);
  }
}
