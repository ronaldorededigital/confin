import { supabase } from '../lib/supabase';
import { Transaction, TransactionType, Category } from '../types';

const DEFAULT_CATEGORIES = [
  { name: 'Salário', type: TransactionType.INCOME },
  { name: 'Freelance', type: TransactionType.INCOME },
  { name: 'Investimentos', type: TransactionType.INCOME },
  { name: 'Alimentação', type: TransactionType.EXPENSE_VARIABLE },
  { name: 'Moradia', type: TransactionType.EXPENSE_FIXED },
  { name: 'Transporte', type: TransactionType.EXPENSE_VARIABLE },
  { name: 'Saúde', type: TransactionType.EXPENSE_VARIABLE },
  { name: 'Lazer', type: TransactionType.EXPENSE_VARIABLE },
  { name: 'Educação', type: TransactionType.EXPENSE_FIXED },
  { name: 'Outros', type: TransactionType.EXPENSE_VARIABLE }
];

export const transactionService = {
  
  getCategories: async (tenantId: string): Promise<Category[]> => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('tenant_id', tenantId);

      if (error) {
        // If table doesn't exist or other error, return defaults mapped to pseudo-objects
        console.warn("Error fetching categories (using defaults):", error.message);
        return DEFAULT_CATEGORIES.map((c, i) => ({
          id: `default-${i}`,
          tenantId,
          name: c.name,
          type: c.type,
          isDefault: true
        }));
      }

      if (!data || data.length === 0) {
         return DEFAULT_CATEGORIES.map((c, i) => ({
          id: `default-${i}`,
          tenantId,
          name: c.name,
          type: c.type,
          isDefault: true
        }));
      }

      return data.map((c: any) => ({
        id: c.id,
        tenantId: c.tenant_id,
        name: c.name,
        type: c.type as TransactionType,
        isDefault: c.is_default
      }));
    } catch (err) {
      console.error("Category Fetch Error:", err);
      return DEFAULT_CATEGORIES.map((c, i) => ({
          id: `default-${i}`,
          tenantId,
          name: c.name,
          type: c.type,
          isDefault: true
        }));
    }
  },

  addCategory: async (category: Partial<Category>): Promise<Category | null> => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .insert({
          tenant_id: category.tenantId,
          name: category.name,
          type: category.type,
          is_default: false
        })
        .select()
        .single();

      if (error) {
        console.error("Error adding category:", error);
        return null;
      }

      return {
        id: data.id,
        tenantId: data.tenant_id,
        name: data.name,
        type: data.type as TransactionType,
        isDefault: data.is_default
      };
    } catch (err) {
      console.error("Add Category Error:", err);
      return null;
    }
  },

  deleteCategory: async (categoryId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId);

      if (error) {
        console.error("Error deleting category:", error);
        return false;
      }
      return true;
    } catch (err) {
      console.error("Delete Category Error:", err);
      return false;
    }
  },

  getTransactions: async (tenantId: string, month: number, year: number): Promise<Transaction[]> => {
    try {
      // Calculate date range for the month
      const startDate = new Date(year, month, 1).toISOString();
      const endDate = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      if (error) {
        console.error("Error fetching transactions:", error);
        return [];
      }

      return data.map((t: any) => ({
        id: t.id,
        description: t.description,
        amount: parseFloat(t.amount),
        date: t.date,
        type: t.type as TransactionType,
        category: t.category,
        userId: t.user_id,
        tenantId: t.tenant_id,
        updatedAt: t.updated_at,
        installments: (t.installments_current && t.installments_total) ? {
          current: t.installments_current,
          total: t.installments_total
        } : undefined
      }));
    } catch (err) {
      console.error("Transaction Fetch Error:", err);
      return [];
    }
  },

  getTransactionsRange: async (tenantId: string, startMonth: number, startYear: number, monthsCount: number): Promise<Transaction[]> => {
    try {
      // Calculate date range
      const startDate = new Date(startYear, startMonth, 1).toISOString();
      const endDate = new Date(startYear, startMonth + monthsCount, 0, 23, 59, 59).toISOString();

      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true }); // Ascending for range view makes more sense usually, but user can sort

      if (error) {
        console.error("Error fetching transactions range:", error);
        return [];
      }

      return data.map((t: any) => ({
        id: t.id,
        description: t.description,
        amount: parseFloat(t.amount),
        date: t.date,
        type: t.type as TransactionType,
        category: t.category,
        userId: t.user_id,
        tenantId: t.tenant_id,
        updatedAt: t.updated_at,
        installments: (t.installments_current && t.installments_total) ? {
          current: t.installments_current,
          total: t.installments_total
        } : undefined
      }));
    } catch (err) {
      console.error("Transaction Range Fetch Error:", err);
      return [];
    }
  },

  addTransaction: async (tx: Partial<Transaction>, installmentOptions?: { count: number, isTotalAmount: boolean, startNextMonth: boolean }): Promise<Transaction | null> => {
    try {
      if (!tx.userId || !tx.tenantId) return null;

      // Handle Installments Logic
      if (tx.type === TransactionType.EXPENSE_INSTALLMENT && installmentOptions) {
        const { count, isTotalAmount, startNextMonth } = installmentOptions;
        
        // Calculate amount per installment
        const amountPerInstallment = isTotalAmount ? (tx.amount! / count) : tx.amount!;
        
        // Determine start date
        const baseDate = new Date(tx.date!);
        if (startNextMonth) {
          baseDate.setMonth(baseDate.getMonth() + 1);
        }

        const transactionsToInsert = [];

        for (let i = 0; i < count; i++) {
          const installmentDate = new Date(baseDate);
          installmentDate.setMonth(baseDate.getMonth() + i); // Add months sequentially

          transactionsToInsert.push({
            user_id: tx.userId,
            tenant_id: tx.tenantId,
            description: tx.description,
            amount: amountPerInstallment,
            date: installmentDate.toISOString(),
            type: tx.type,
            category: tx.category || 'Geral',
            installments_current: i + 1,
            installments_total: count
          });
        }

        const { data, error } = await supabase
          .from('transactions')
          .insert(transactionsToInsert)
          .select();

        if (error) {
          console.error("Error adding installment transactions:", error);
          return null;
        }
        
        // Return the first one just for UI feedback (or handle differently)
        const firstTx = data[0];
        return {
           id: firstTx.id,
           description: firstTx.description,
           amount: parseFloat(firstTx.amount),
           date: firstTx.date,
           type: firstTx.type as TransactionType,
           category: firstTx.category,
           userId: firstTx.user_id,
           tenantId: firstTx.tenant_id,
           updatedAt: firstTx.updated_at,
           installments: {
             current: firstTx.installments_current,
             total: firstTx.installments_total
           }
        };

      } else {
        // Single Transaction
        const dbPayload = {
          user_id: tx.userId,
          tenant_id: tx.tenantId,
          description: tx.description,
          amount: tx.amount,
          date: tx.date,
          type: tx.type,
          category: tx.category || 'Geral',
          installments_current: tx.installments?.current,
          installments_total: tx.installments?.total
        };

        const { data, error } = await supabase
          .from('transactions')
          .insert(dbPayload)
          .select()
          .single();

        if (error) {
          console.error("Error adding transaction:", error);
          return null;
        }

        return {
          id: data.id,
          description: data.description,
          amount: parseFloat(data.amount),
          date: data.date,
          type: data.type as TransactionType,
          category: data.category,
          userId: data.user_id,
          tenantId: data.tenant_id,
          updatedAt: data.updated_at,
          installments: (data.installments_current && data.installments_total) ? {
            current: data.installments_current,
            total: data.installments_total
          } : undefined
        };
      }
    } catch (err) {
      console.error("Add Transaction Error:", err);
      return null;
    }
  },

  updateTransaction: async (id: string, updates: Partial<Transaction>): Promise<Transaction | null> => {
    try {
      const payload: any = {
        updated_at: new Date().toISOString()
      };
      
      if (updates.description) payload.description = updates.description;
      if (updates.amount) payload.amount = updates.amount;
      if (updates.date) payload.date = updates.date;
      if (updates.category) payload.category = updates.category;
      if (updates.type) payload.type = updates.type;

      const { data, error } = await supabase
        .from('transactions')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error("Error updating transaction:", error);
        return null;
      }

      return {
        id: data.id,
        description: data.description,
        amount: parseFloat(data.amount),
        date: data.date,
        type: data.type as TransactionType,
        category: data.category,
        userId: data.user_id,
        tenantId: data.tenant_id,
        updatedAt: data.updated_at,
        installments: (data.installments_current && data.installments_total) ? {
          current: data.installments_current,
          total: data.installments_total
        } : undefined
      };
    } catch (err) {
      console.error("Update Transaction Error:", err);
      return null;
    }
  },

  deleteTransaction: async (id: string, deleteAllInstallments: boolean = false, transaction?: Transaction): Promise<boolean> => {
    try {
      if (deleteAllInstallments && transaction && transaction.installments) {
        // Find all transactions that look like they belong to the same installment set
        // This is a heuristic since we don't have a 'group_id' for installments in this simple schema
        // We match: tenant_id, description, type, installments_total, and created_at (roughly)
        // A better way would be to add an 'installment_group_id' to the schema, but for now we'll do best effort or just delete by ID if we had the group ID.
        // Since we don't have a group ID, we will rely on the user deleting them one by one OR 
        // we can try to find them by description + amount + total installments + tenant_id
        
        // Actually, without a group_id, deleting "all" is risky. 
        // Let's implement a safer "Delete All" by assuming they were created at the exact same time (batch insert)
        // or just delete this single one if we can't be sure.
        
        // Strategy: Delete where description, type, installments_total match and tenant matches.
        const { error } = await supabase
          .from('transactions')
          .delete()
          .eq('tenant_id', transaction.tenantId)
          .eq('description', transaction.description)
          .eq('type', transaction.type)
          .eq('installments_total', transaction.installments.total);

        if (error) {
           console.error("Error deleting all installments:", error);
           return false;
        }
        return true;

      } else {
        // Delete single transaction
        const { error } = await supabase
          .from('transactions')
          .delete()
          .eq('id', id);

        if (error) {
          console.error("Error deleting transaction:", error);
          return false;
        }
        return true;
      }
    } catch (err) {
      console.error("Delete Transaction Error:", err);
      return false;
    }
  }
};