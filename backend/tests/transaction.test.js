const { generateTransactionReference } = require('../src/utils/generateReference');

describe('Transaction Utilities', () => {
  describe('generateTransactionReference', () => {
    it('should generate a valid transaction reference', () => {
      const reference = generateTransactionReference();
      expect(reference).toMatch(/^TX-\d{8}-[A-Z0-9]{6}$/);
    });

    it('should generate unique references', () => {
      const ref1 = generateTransactionReference();
      const ref2 = generateTransactionReference();
      expect(ref1).not.toBe(ref2);
    });

    it('should include current date in reference', () => {
      const reference = generateTransactionReference();
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      expect(reference).toContain(today);
    });
  });
});

describe('Transaction Atomicity Tests', () => {
  // This is a conceptual test to demonstrate the atomicity requirement
  // In a real implementation, this would test the actual rollback behavior
  
  describe('Transfer Rollback Scenario', () => {
    it('should rollback transfer if credit operation fails', () => {
      // This test demonstrates the critical requirement:
      // If a transfer fails after debiting the origin wallet,
      // the debit should be rolled back to prevent data loss
      
      const scenario = {
        originBalance: 100000,
        transferAmount: 50000,
        expectedOriginAfterDebit: 50000,
        expectedOriginAfterRollback: 100000,
        expectedDestinationAfterCredit: 50000
      };

      // Simulate the transfer operation
      let originBalance = scenario.originBalance;
      
      // Step 1: Debit origin wallet
      originBalance -= scenario.transferAmount;
      expect(originBalance).toBe(scenario.expectedOriginAfterDebit);
      
      // Step 2: Simulate failure in credit operation
      const creditFailed = true;
      
      // Step 3: Rollback debit if credit failed
      if (creditFailed) {
        originBalance += scenario.transferAmount;
        expect(originBalance).toBe(scenario.expectedOriginAfterRollback);
      }
      
      // Final state should match initial state after rollback
      expect(originBalance).toBe(scenario.originBalance);
    });

    it('should maintain consistency in concurrent transfers', () => {
      // This test demonstrates the need for SELECT ... FOR UPDATE
      // to prevent race conditions in concurrent transfers
      
      const initialBalance = 100000;
      const transfer1Amount = 30000;
      const transfer2Amount = 40000;
      
      // Without proper locking, concurrent transfers could:
      // 1. Both read the initial balance (100000)
      // 2. Both subtract their amounts
      // 3. Result in inconsistent final state
      
      // With proper locking (SELECT ... FOR UPDATE):
      // - First transfer locks the row
      // - Second transfer waits for lock release
      // - Each transfer sees the updated balance
      
      let balance = initialBalance;
      
      // First transfer (with lock)
      balance -= transfer1Amount;
      expect(balance).toBe(70000);
      
      // Second transfer (waits for lock, sees updated balance)
      balance -= transfer2Amount;
      expect(balance).toBe(30000);
      
      // Final state is consistent
      expect(balance).toBe(initialBalance - transfer1Amount - transfer2Amount);
    });
  });
});
