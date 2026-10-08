-- WalletUCP Database Schema
-- This script creates all tables for the academic virtual wallet system

-- Create usuarios table
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    telefono VARCHAR(20),
    estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (estado IN ('ACTIVE', 'BLOCKED')),
    rol VARCHAR(20) NOT NULL DEFAULT 'USER' CHECK (rol IN ('USER', 'ADMIN')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create billeteras table
CREATE TABLE IF NOT EXISTS billeteras (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER UNIQUE NOT NULL,
    saldo NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (saldo >= 0),
    estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (estado IN ('ACTIVE', 'BLOCKED', 'CLOSED')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Create transacciones table
CREATE TABLE IF NOT EXISTS transacciones (
    id SERIAL PRIMARY KEY,
    referencia VARCHAR(50) UNIQUE NOT NULL,
    origen_wallet_id INTEGER,
    destino_wallet_id INTEGER,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('DEPOSIT', 'WITHDRAW', 'TRANSFER')),
    monto NUMERIC(15, 2) NOT NULL CHECK (monto > 0),
    estado VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (estado IN ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED')),
    descripcion TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (origen_wallet_id) REFERENCES billeteras(id) ON DELETE SET NULL,
    FOREIGN KEY (destino_wallet_id) REFERENCES billeteras(id) ON DELETE SET NULL
);

-- Create movimientos table
CREATE TABLE IF NOT EXISTS movimientos (
    id SERIAL PRIMARY KEY,
    wallet_id INTEGER NOT NULL,
    transaction_id INTEGER NOT NULL,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('CREDIT', 'DEBIT')),
    monto NUMERIC(15, 2) NOT NULL CHECK (monto > 0),
    saldo_anterior NUMERIC(15, 2) NOT NULL,
    saldo_resultante NUMERIC(15, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (wallet_id) REFERENCES billeteras(id) ON DELETE CASCADE,
    FOREIGN KEY (transaction_id) REFERENCES transacciones(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_movimientos_wallet_created ON movimientos(wallet_id, created_at);
CREATE INDEX IF NOT EXISTS idx_transacciones_origen ON transacciones(origen_wallet_id);
CREATE INDEX IF NOT EXISTS idx_transacciones_destino ON transacciones(destino_wallet_id);
CREATE INDEX IF NOT EXISTS idx_transacciones_created ON transacciones(created_at);
CREATE INDEX IF NOT EXISTS idx_usuarios_estado ON usuarios(estado);
CREATE INDEX IF NOT EXISTS idx_billeteras_estado ON billeteras(estado);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
-- DROP IF EXISTS keeps this migration idempotent so it can be re-run safely
DROP TRIGGER IF EXISTS update_usuarios_updated_at ON usuarios;
CREATE TRIGGER update_usuarios_updated_at BEFORE UPDATE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_billeteras_updated_at ON billeteras;
CREATE TRIGGER update_billeteras_updated_at BEFORE UPDATE ON billeteras
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------------
-- Tarjetas: cada usuario tiene exactamente DOS, una de credito y una de debito,
-- y cada una guarda su propio saldo. El saldo de la billetera es SIEMPRE la
-- suma de sus dos tarjetas: toda operacion actualiza la tarjeta y la billetera
-- en la misma transaccion, bajo SELECT ... FOR UPDATE.
--
-- Por seguridad nunca se guarda el numero completo ni el CVV: solo los ultimos
-- 4 digitos, suficientes para que el usuario reconozca su tarjeta.
--
-- Esta seccion es idempotente: sobre una base existente basta con volver a
-- ejecutar este archivo completo.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tarjetas (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('CREDIT', 'DEBIT')),
    marca VARCHAR(20) NOT NULL CHECK (marca IN ('VISA', 'MASTERCARD')),
    ultimos_digitos CHAR(4) NOT NULL CHECK (ultimos_digitos ~ '^[0-9]{4}$'),
    saldo NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (saldo >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    -- Una sola tarjeta de cada tipo por usuario.
    CONSTRAINT uq_tarjetas_usuario_tipo UNIQUE (usuario_id, tipo)
);

DROP TRIGGER IF EXISTS update_tarjetas_updated_at ON tarjetas;
CREATE TRIGGER update_tarjetas_updated_at BEFORE UPDATE ON tarjetas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Tarjeta de la que sale el dinero (retiro, transferencia) y a la que llega
-- (deposito, transferencia). Las transacciones anteriores quedan con NULL.
ALTER TABLE transacciones ADD COLUMN IF NOT EXISTS tarjeta_origen_id INTEGER;
ALTER TABLE transacciones ADD COLUMN IF NOT EXISTS tarjeta_destino_id INTEGER;
-- Tarjeta cuyo saldo cambio con este movimiento.
ALTER TABLE movimientos ADD COLUMN IF NOT EXISTS tarjeta_id INTEGER;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_transacciones_tarjeta_origen') THEN
        ALTER TABLE transacciones ADD CONSTRAINT fk_transacciones_tarjeta_origen
            FOREIGN KEY (tarjeta_origen_id) REFERENCES tarjetas(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_transacciones_tarjeta_destino') THEN
        ALTER TABLE transacciones ADD CONSTRAINT fk_transacciones_tarjeta_destino
            FOREIGN KEY (tarjeta_destino_id) REFERENCES tarjetas(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_movimientos_tarjeta') THEN
        ALTER TABLE movimientos ADD CONSTRAINT fk_movimientos_tarjeta
            FOREIGN KEY (tarjeta_id) REFERENCES tarjetas(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_movimientos_tarjeta ON movimientos(tarjeta_id);

-- Backfill para usuarios que ya existian: les crea sus dos tarjetas. El saldo
-- actual de la billetera pasa COMPLETO a la de debito y la de credito empieza
-- en 0, asi que no se crea ni se pierde dinero. ON CONFLICT lo hace
-- idempotente: a un usuario que ya tiene sus tarjetas no se le toca nada.
INSERT INTO tarjetas (usuario_id, tipo, marca, ultimos_digitos, saldo)
SELECT b.usuario_id, c.tipo, c.marca,
       LPAD((FLOOR(RANDOM() * 10000))::INT::TEXT, 4, '0'),
       CASE WHEN c.tipo = 'DEBIT' THEN b.saldo ELSE 0 END
FROM billeteras b
CROSS JOIN (VALUES ('CREDIT', 'VISA'), ('DEBIT', 'MASTERCARD')) AS c(tipo, marca)
ON CONFLICT (usuario_id, tipo) DO NOTHING;
