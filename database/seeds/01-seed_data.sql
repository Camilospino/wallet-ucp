-- WalletUCP Seed Data
-- This script populates the database with test users and sample transactions

-- Note: These are real bcrypt hashes for the test users (verified against bcryptjs).
-- Passwords: Admin123! (admin), User123! (user1, user2)
-- This script is idempotent: it can be executed more than once safely.

-- Insert admin user
INSERT INTO usuarios (nombre, apellido, email, password_hash, telefono, estado, rol)
VALUES (
    'Admin',
    'User',
    'admin@example.com',
    '$2b$10$Y1it0B6VtD7/mEUy1z5PG.2/TGhMOILzZprQWsNlAGYpw/FrlXNjC', -- bcrypt hash for 'Admin123!'
    '+1234567890',
    'ACTIVE',
    'ADMIN'
) ON CONFLICT (email) DO NOTHING;

-- Insert regular users
INSERT INTO usuarios (nombre, apellido, email, password_hash, telefono, estado, rol)
VALUES 
    ('Juan', 'Pérez', 'user1@example.com', '$2b$10$NWwnU.2xkX.HP/9R7Ju8peTS6rmCI9Mg1HdUMIHs3hv4c1X2lP0By', '+1234567891', 'ACTIVE', 'USER'),
    ('María', 'García', 'user2@example.com', '$2b$10$NWwnU.2xkX.HP/9R7Ju8peTS6rmCI9Mg1HdUMIHs3hv4c1X2lP0By', '+1234567892', 'ACTIVE', 'USER')
ON CONFLICT (email) DO NOTHING;

-- Create wallets for users (should be created automatically by registration, but ensuring they exist)
INSERT INTO billeteras (usuario_id, saldo, estado)
SELECT id, 0.00, 'ACTIVE' FROM usuarios WHERE email IN ('admin@example.com', 'user1@example.com', 'user2@example.com')
ON CONFLICT (usuario_id) DO NOTHING;

-- NOTE: initial balances are applied at the end of the DO block below, derived
-- from the sample movements so the ledger and the balances always agree.

-- Create sample transactions
-- NOTE: every variable MUST be declared in the DECLARE section of the DO block.
-- Declaring them inline in the body is invalid PL/pgSQL and aborts the whole script.
DO $$
DECLARE
    admin_wallet_id   INTEGER;
    user1_wallet_id   INTEGER;
    user2_wallet_id   INTEGER;
    deposit_tx_id     INTEGER;
    transfer_tx_id    INTEGER;
    withdraw_tx_id    INTEGER;
BEGIN
    SELECT id INTO admin_wallet_id FROM billeteras WHERE usuario_id = (SELECT id FROM usuarios WHERE email = 'admin@example.com');
    SELECT id INTO user1_wallet_id FROM billeteras WHERE usuario_id = (SELECT id FROM usuarios WHERE email = 'user1@example.com');
    SELECT id INTO user2_wallet_id FROM billeteras WHERE usuario_id = (SELECT id FROM usuarios WHERE email = 'user2@example.com');

    -- Deposit to user1
    INSERT INTO transacciones (referencia, origen_wallet_id, destino_wallet_id, tipo, monto, estado, descripcion)
    VALUES ('TX-20260925-ADMIN001', NULL, user1_wallet_id, 'DEPOSIT', 100000.00, 'COMPLETED', 'Depósito inicial de prueba')
    ON CONFLICT (referencia) DO NOTHING;

    -- Get the transaction ID for the deposit
    SELECT id INTO deposit_tx_id FROM transacciones WHERE referencia = 'TX-20260925-ADMIN001';

    -- Create movement for the deposit
    INSERT INTO movimientos (wallet_id, transaction_id, tipo, monto, saldo_anterior, saldo_resultante)
    SELECT user1_wallet_id, deposit_tx_id, 'CREDIT', 100000.00, 0.00, 100000.00
    WHERE deposit_tx_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM movimientos WHERE transaction_id = deposit_tx_id AND wallet_id = user1_wallet_id);

    -- Transfer from user1 to user2
    INSERT INTO transacciones (referencia, origen_wallet_id, destino_wallet_id, tipo, monto, estado, descripcion)
    VALUES ('TX-20260925-TRANSFER001', user1_wallet_id, user2_wallet_id, 'TRANSFER', 25000.00, 'COMPLETED', 'Transferencia de prueba')
    ON CONFLICT (referencia) DO NOTHING;

    -- Get the transaction ID for the transfer
    SELECT id INTO transfer_tx_id FROM transacciones WHERE referencia = 'TX-20260925-TRANSFER001';

    -- Create movements for the transfer
    INSERT INTO movimientos (wallet_id, transaction_id, tipo, monto, saldo_anterior, saldo_resultante)
    SELECT user1_wallet_id, transfer_tx_id, 'DEBIT', 25000.00, 100000.00, 75000.00
    WHERE transfer_tx_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM movimientos WHERE transaction_id = transfer_tx_id AND wallet_id = user1_wallet_id);

    INSERT INTO movimientos (wallet_id, transaction_id, tipo, monto, saldo_anterior, saldo_resultante)
    SELECT user2_wallet_id, transfer_tx_id, 'CREDIT', 25000.00, 0.00, 25000.00
    WHERE transfer_tx_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM movimientos WHERE transaction_id = transfer_tx_id AND wallet_id = user2_wallet_id);

    -- Withdraw from user1
    INSERT INTO transacciones (referencia, origen_wallet_id, destino_wallet_id, tipo, monto, estado, descripcion)
    VALUES ('TX-20260925-WITHDRAW001', user1_wallet_id, NULL, 'WITHDRAW', 10000.00, 'COMPLETED', 'Retiro de prueba')
    ON CONFLICT (referencia) DO NOTHING;

    -- Get the transaction ID for the withdrawal
    SELECT id INTO withdraw_tx_id FROM transacciones WHERE referencia = 'TX-20260925-WITHDRAW001';

    -- Create movement for the withdrawal
    INSERT INTO movimientos (wallet_id, transaction_id, tipo, monto, saldo_anterior, saldo_resultante)
    SELECT user1_wallet_id, withdraw_tx_id, 'DEBIT', 10000.00, 75000.00, 65000.00
    WHERE withdraw_tx_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM movimientos WHERE transaction_id = withdraw_tx_id AND wallet_id = user1_wallet_id);

    -- Reconcile final balances with the movements just recorded
    -- user1: 0 + 100000 - 25000 - 10000 = 65000
    -- user2: 0 + 25000 = 25000
    UPDATE billeteras SET saldo = 65000.00 WHERE id = user1_wallet_id;
    UPDATE billeteras SET saldo = 25000.00 WHERE id = user2_wallet_id;

END $$;

-- Every user owns a credit and a debit card. The schema already backfills
-- them, but at that point the seed users did not exist yet, so they are
-- created here, AFTER the balances above are final: the whole balance goes to
-- the debit card, keeping wallet balance = sum of its cards.
INSERT INTO tarjetas (usuario_id, tipo, marca, ultimos_digitos, saldo)
SELECT b.usuario_id, c.tipo, c.marca,
       LPAD((FLOOR(RANDOM() * 10000))::INT::TEXT, 4, '0'),
       CASE WHEN c.tipo = 'DEBIT' THEN b.saldo ELSE 0 END
FROM billeteras b
CROSS JOIN (VALUES ('CREDIT', 'VISA'), ('DEBIT', 'MASTERCARD')) AS c(tipo, marca)
ON CONFLICT (usuario_id, tipo) DO NOTHING;
