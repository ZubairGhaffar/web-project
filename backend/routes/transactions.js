const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget'); // Import Budget model
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');

// Helper function to update budget spent amounts
const updateBudgetSpent = async (userId, transaction, isDelete = false, oldAmount = null, oldCategory = null) => {
  try {
    if (transaction.type !== 'expense') return;
    
    // Handle category change scenario
    if (oldCategory && oldCategory !== transaction.category) {
      // Decrement from old budget category
      const oldBudget = await Budget.findOne({
        userId,
        category: oldCategory,
        isActive: true
      });
      
      if (oldBudget) {
        const startDate = oldBudget.startDate;
        const endDate = new Date(startDate);
        
        switch (oldBudget.period) {
          case 'weekly':
            endDate.setDate(endDate.getDate() + 7);
            break;
          case 'monthly':
            endDate.setMonth(endDate.getMonth() + 1);
            break;
          case 'yearly':
            endDate.setFullYear(endDate.getFullYear() + 1);
            break;
        }
        
        if (transaction.date >= startDate && transaction.date < endDate) {
          oldBudget.spent = Math.max(0, oldBudget.spent - (oldAmount || transaction.amount));
          await oldBudget.save();
        }
      }
    }
    
    // Find budget for current category
    const budget = await Budget.findOne({
      userId,
      category: transaction.category,
      isActive: true
    });
    
    if (budget) {
      // Check if transaction date is within budget period
      const startDate = budget.startDate;
      const endDate = new Date(startDate);
      
      switch (budget.period) {
        case 'weekly':
          endDate.setDate(endDate.getDate() + 7);
          break;
        case 'monthly':
          endDate.setMonth(endDate.getMonth() + 1);
          break;
        case 'yearly':
          endDate.setFullYear(endDate.getFullYear() + 1);
          break;
      }
      
      if (transaction.date >= startDate && transaction.date < endDate) {
        if (isDelete) {
          budget.spent = Math.max(0, budget.spent - transaction.amount);
        } else {
          const amountToAdd = oldAmount ? (transaction.amount - oldAmount) : transaction.amount;
          budget.spent += amountToAdd;
        }
        await budget.save();
      }
    }
  } catch (error) {
    console.error('Error updating budget spent:', error);
  }
};

// Get all transactions for the logged-in user (in PKR)
router.get('/', auth, async (req, res) => {
  try {
    const { startDate, endDate, category, type, month, year } = req.query;
    let query = { userId: req.user._id };
    
    if (category) query.category = category;
    if (type) query.type = type;
    
    // Handle month/year filtering
    if (month && year) {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0);
      query.date = { $gte: start, $lte: end };
    } else if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }
    
    const transactions = await Transaction.find(query).sort('-date');
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add new transaction (in PKR)
router.post('/', auth, [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('amount').isNumeric().withMessage('Amount must be a number')
    .custom(value => value > 0).withMessage('Amount must be greater than 0'),
  body('type').isIn(['income', 'expense']).withMessage('Type must be income or expense'),
  body('category').trim().notEmpty().withMessage('Category is required'),
  body('date').optional().isISO8601().withMessage('Date must be valid ISO format')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  try {
    // All amounts are in PKR
    const transactionData = {
      ...req.body,
      userId: req.user._id,
      amount: parseFloat(req.body.amount),
      currency: 'PKR', // Always PKR
      date: req.body.date ? new Date(req.body.date) : new Date()
    };
    
    const transaction = new Transaction(transactionData);
    await transaction.save();
    
    // Update budget if this is an expense
    if (transaction.type === 'expense') {
      await updateBudgetSpent(req.user._id, transaction);
    }
    
    res.status(201).json(transaction);
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(400).json({ error: error.message });
  }
});

// Update transaction (in PKR)
router.put('/:id', auth, [
  body('amount').optional().isNumeric().withMessage('Amount must be a number')
    .custom(value => value > 0).withMessage('Amount must be greater than 0'),
  body('type').optional().isIn(['income', 'expense']).withMessage('Type must be income or expense'),
  body('category').optional().trim().notEmpty().withMessage('Category is required'),
  body('date').optional().isISO8601().withMessage('Date must be valid ISO format')
], async (req, res) => {
  try {
    // Get the old transaction first
    const oldTransaction = await Transaction.findOne({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!oldTransaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    // Update transaction
    const transaction = await Transaction.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { ...req.body, currency: 'PKR' }, // Ensure currency stays PKR
      { new: true, runValidators: true }
    );
    
    // Handle budget updates if type changed from expense or category/amount changed
    if (oldTransaction.type === 'expense' || transaction.type === 'expense') {
      if (oldTransaction.type === 'expense' && transaction.type === 'expense') {
        // Expense to expense - update budget amounts
        await updateBudgetSpent(
          req.user._id, 
          transaction, 
          false, 
          oldTransaction.amount,
          oldTransaction.category
        );
      } else if (oldTransaction.type === 'expense' && transaction.type !== 'expense') {
        // Expense to income - remove from budget
        await updateBudgetSpent(req.user._id, oldTransaction, true);
      } else if (oldTransaction.type !== 'expense' && transaction.type === 'expense') {
        // Income to expense - add to budget
        await updateBudgetSpent(req.user._id, transaction);
      }
    }
    
    res.json(transaction);
  } catch (error) {
    console.error('Error updating transaction:', error);
    res.status(400).json({ error: error.message });
  }
});

// Delete transaction
router.delete('/:id', auth, async (req, res) => {
  try {
    const transaction = await Transaction.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    // Update budget if this was an expense
    if (transaction.type === 'expense') {
      await updateBudgetSpent(req.user._id, transaction, true);
    }
    
    res.json({ 
      success: true,
      message: 'Transaction deleted successfully',
      deletedTransaction: transaction 
    });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get summary statistics for the logged-in user (in PKR)
router.get('/summary', auth, async (req, res) => {
  try {
    const { startDate, endDate, month, year } = req.query;
    let matchQuery = { userId: req.user._id };
    
    // Handle month/year filtering
    if (month && year) {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0);
      matchQuery.date = { $gte: start, $lte: end };
    } else if (startDate || endDate) {
      matchQuery.date = {};
      if (startDate) matchQuery.date.$gte = new Date(startDate);
      if (endDate) matchQuery.date.$lte = new Date(endDate);
    }
    
    // Get current month's data by default if no date range specified
    if (!startDate && !endDate && !month && !year) {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      matchQuery.date = { $gte: start, $lte: end };
    }
    
    const summary = await Transaction.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
          average: { $avg: '$amount' },
          max: { $max: '$amount' },
          min: { $min: '$amount' }
        }
      }
    ]);
    
    // Calculate net balance
    const income = summary.find(s => s._id === 'income')?.total || 0;
    const expense = summary.find(s => s._id === 'expense')?.total || 0;
    const netBalance = income - expense;
    
    // Get category-wise breakdown for expenses
    const categoryBreakdown = await Transaction.aggregate([
      { $match: { ...matchQuery, type: 'expense' } },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
          average: { $avg: '$amount' }
        }
      },
      { $sort: { total: -1 } }
    ]);
    
    // Get recent transactions
    const recentTransactions = await Transaction.find(matchQuery)
      .sort('-date')
      .limit(10);
    
    // Get top expense categories
    const topExpenses = categoryBreakdown.slice(0, 5);
    
    res.json({
      income,
      expense,
      netBalance,
      currency: 'PKR',
      period: matchQuery.date ? 'custom' : 'current_month',
      summary: summary,
      categoryBreakdown,
      recentTransactions,
      topExpenses,
      analytics: {
        savingsRate: income > 0 ? (netBalance / income) * 100 : 0,
        expenseToIncomeRatio: income > 0 ? (expense / income) * 100 : 0
      }
    });
  } catch (error) {
    console.error('Error fetching transaction summary:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get category statistics (in PKR)
router.get('/categories', auth, async (req, res) => {
  try {
    const { type, startDate, endDate, month, year } = req.query;
    let matchQuery = { userId: req.user._id };
    
    if (type) matchQuery.type = type;
    
    // Handle month/year filtering
    if (month && year) {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0);
      matchQuery.date = { $gte: start, $lte: end };
    } else if (startDate || endDate) {
      matchQuery.date = {};
      if (startDate) matchQuery.date.$gte = new Date(startDate);
      if (endDate) matchQuery.date.$lte = new Date(endDate);
    }
    
    const categories = await Transaction.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
          average: { $avg: '$amount' }
        }
      },
      { $sort: { total: -1 } }
    ]);
    
    res.json({
      categories,
      currency: 'PKR',
      count: categories.length,
      total: categories.reduce((sum, cat) => sum + cat.total, 0)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET monthly summary (in PKR)
router.get('/monthly-summary', auth, async (req, res) => {
  try {
    const { months = 6 } = req.query;
    const userId = req.user._id;
    
    // Get data for last N months
    const monthlySummary = await Transaction.aggregate([
      {
        $match: {
          userId: userId,
          date: {
            $gte: new Date(new Date().setMonth(new Date().getMonth() - parseInt(months)))
          }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
            type: '$type'
          },
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } }
    ]);
    
    // Format the data for easier consumption
    const formattedSummary = {};
    monthlySummary.forEach(item => {
      const key = `${item._id.year}-${item._id.month.toString().padStart(2, '0')}`;
      if (!formattedSummary[key]) {
        formattedSummary[key] = {
          year: item._id.year,
          month: item._id.month,
          income: 0,
          expense: 0,
          netBalance: 0
        };
      }
      
      if (item._id.type === 'income') {
        formattedSummary[key].income = item.total;
      } else if (item._id.type === 'expense') {
        formattedSummary[key].expense = item.total;
      }
      
      formattedSummary[key].netBalance = formattedSummary[key].income - formattedSummary[key].expense;
    });
    
    // Convert to array and sort by date
    const result = Object.values(formattedSummary)
      .sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
      });
    
    res.json({
      monthlySummary: result,
      currency: 'PKR',
      monthsAnalyzed: result.length
    });
  } catch (error) {
    console.error('Error fetching monthly summary:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET complete financial summary (income, expense, investments) - All in PKR
router.get('/complete-summary', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let matchQuery = { userId: req.user._id };
    
    if (startDate || endDate) {
      matchQuery.date = {};
      if (startDate) matchQuery.date.$gte = new Date(startDate);
      if (endDate) matchQuery.date.$lte = new Date(endDate);
    }
    
    // Get transaction summary (all amounts in PKR)
    const transactionSummary = await Transaction.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);
    
    const income = transactionSummary.find(s => s._id === 'income')?.total || 0;
    const expense = transactionSummary.find(s => s._id === 'expense')?.total || 0;
    const transactionNetBalance = income - expense;
    
    // Get investment summary (all converted to PKR)
    const Investment = require('../models/Investment');
    const investments = await Investment.find({ 
      userId: req.user._id,
      status: { $in: ['active', 'partial'] }
    });
    
    let totalInvestedPKR = 0;
    let totalCurrentValuePKR = 0;
    
    if (investments.length > 0) {
      // Enrich investments with current prices (already converted to PKR in coinService)
      const coinService = require('../services/coinService');
      const userCurrency = 'PKR'; // Always PKR for this application
      const enrichedInvestments = await coinService.enrichInvestments(investments, userCurrency);
      
      totalInvestedPKR = enrichedInvestments.reduce((sum, inv) => sum + inv.investedAmountLocal, 0);
      totalCurrentValuePKR = enrichedInvestments.reduce((sum, inv) => sum + (inv.currentValueLocal || 0), 0);
    }
    
    // Calculate net balance including investments
    const netBalanceWithInvestments = transactionNetBalance + totalCurrentValuePKR;
    
    // Get budget summary
    const budgets = await Budget.find({ 
      userId: req.user._id,
      isActive: true 
    });
    
    const totalMonthlyBudget = budgets.reduce((sum, budget) => sum + budget.getMonthlyEquivalent(), 0);
    const totalBudgetSpent = budgets.reduce((sum, budget) => sum + budget.spent, 0);
    
    res.json({
      transactions: {
        income,
        expense,
        netBalance: transactionNetBalance,
        currency: 'PKR',
        incomeCount: transactionSummary.find(s => s._id === 'income')?.count || 0,
        expenseCount: transactionSummary.find(s => s._id === 'expense')?.count || 0
      },
      investments: {
        totalInvestedPKR,
        totalCurrentValuePKR,
        totalProfitLossPKR: totalCurrentValuePKR - totalInvestedPKR,
        totalProfitLossPercentage: totalInvestedPKR > 0 
          ? ((totalCurrentValuePKR - totalInvestedPKR) / totalInvestedPKR) * 100 
          : 0,
        count: investments.length,
        currency: 'PKR'
      },
      budgets: {
        totalMonthlyBudget,
        totalBudgetSpent,
        remainingBudget: totalMonthlyBudget - totalBudgetSpent,
        budgetsCount: budgets.length,
        currency: 'PKR'
      },
      overall: {
        netWorth: netBalanceWithInvestments,
        availableBalance: transactionNetBalance,
        investmentValue: totalCurrentValuePKR,
        totalAssets: netBalanceWithInvestments > 0 ? netBalanceWithInvestments : 0,
        currency: 'PKR'
      },
      breakdown: {
        availableBalance: transactionNetBalance,
        investmentValue: totalCurrentValuePKR,
        budgetedAmount: totalMonthlyBudget
      }
    });
  } catch (error) {
    console.error('Complete summary error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET transaction analytics (in PKR)
router.get('/analytics', auth, async (req, res) => {
  try {
    const { months = 12 } = req.query;
    const userId = req.user._id;
    
    // Get monthly trends
    const monthlyTrends = await Transaction.aggregate([
      {
        $match: {
          userId: userId,
          date: {
            $gte: new Date(new Date().setMonth(new Date().getMonth() - parseInt(months)))
          }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
            type: '$type'
          },
          total: { $sum: '$amount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);
    
    // Get category trends
    const categoryTrends = await Transaction.aggregate([
      {
        $match: {
          userId: userId,
          type: 'expense',
          date: {
            $gte: new Date(new Date().setMonth(new Date().getMonth() - 3))
          }
        }
      },
      {
        $group: {
          _id: {
            category: '$category',
            month: { $month: '$date' },
            year: { $year: '$date' }
          },
          total: { $sum: '$amount' }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1, total: -1 } }
    ]);
    
    // Get average transaction size
    const averages = await Transaction.aggregate([
      {
        $match: { userId: userId }
      },
      {
        $group: {
          _id: '$type',
          average: { $avg: '$amount' },
          median: { 
            $avg: {
              $percentile: {
                input: '$amount',
                p: [0.5],
                method: 'approximate'
              }
            }
          },
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Get largest transactions
    const largestTransactions = await Transaction.find({ userId: userId })
      .sort('-amount')
      .limit(5);
    
    res.json({
      monthlyTrends,
      categoryTrends,
      averages,
      largestTransactions,
      currency: 'PKR',
      analysisPeriod: `${months} months`
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;