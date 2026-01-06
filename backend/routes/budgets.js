const express = require('express');
const router = express.Router();
const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction'); // To update spent amounts
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');

// Get all budgets for the logged-in user
router.get('/', auth, async (req, res) => {
  try {
    const budgets = await Budget.find({ userId: req.user._id, isActive: true });
    res.json(budgets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new budget (in PKR)
router.post('/', auth, [
  body('category').notEmpty().withMessage('Category is required'),
  body('limit').isNumeric().withMessage('Limit must be a number')
    .custom(value => value > 0).withMessage('Limit must be greater than 0'),
  body('period').isIn(['weekly', 'monthly', 'yearly']).withMessage('Invalid period')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    // Check if budget already exists for this category and period
    const existingBudget = await Budget.findOne({
      userId: req.user._id,
      category: req.body.category,
      period: req.body.period,
      isActive: true
    });

    if (existingBudget) {
      return res.status(400).json({ 
        error: `Budget already exists for ${req.body.category} (${req.body.period})` 
      });
    }

    const budgetData = {
      ...req.body,
      userId: req.user._id,
      spent: 0, // Initialize spent as 0
      currency: 'PKR', // Always PKR
      startDate: req.body.startDate ? new Date(req.body.startDate) : new Date()
    };

    // Calculate initial spent amount from existing transactions
    const startDate = budgetData.startDate;
    const endDate = new Date(startDate);
    
    // Set end date based on period
    switch (budgetData.period) {
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

    // Get transactions for this category and period
    const transactions = await Transaction.find({
      userId: req.user._id,
      category: budgetData.category,
      type: 'expense',
      date: { $gte: startDate, $lt: endDate }
    });

    // Calculate initial spent amount
    const initialSpent = transactions.reduce((sum, transaction) => sum + transaction.amount, 0);
    budgetData.spent = initialSpent;

    const budget = new Budget(budgetData);
    await budget.save();
    
    res.status(201).json(budget);
  } catch (error) {
    console.error('Budget creation error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Update budget (in PKR)
router.put('/:id', auth, [
  body('limit').optional().isNumeric().withMessage('Limit must be a number')
    .custom(value => value > 0).withMessage('Limit must be greater than 0'),
  body('period').optional().isIn(['weekly', 'monthly', 'yearly']).withMessage('Invalid period'),
  body('isActive').optional().isBoolean().withMessage('isActive must be boolean')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const budget = await Budget.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { ...req.body, currency: 'PKR' }, // Ensure currency stays PKR
      { new: true, runValidators: true }
    );
    
    if (!budget) {
      return res.status(404).json({ error: 'Budget not found' });
    }
    
    res.json(budget);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete budget
router.delete('/:id', auth, async (req, res) => {
  try {
    const budget = await Budget.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!budget) {
      return res.status(404).json({ error: 'Budget not found' });
    }
    
    res.json({ 
      success: true,
      message: 'Budget deleted successfully',
      deletedBudget: budget 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get budget summary for the logged-in user (in PKR)
router.get('/summary', auth, async (req, res) => {
  try {
    const budgets = await Budget.find({ 
      userId: req.user._id,
      isActive: true 
    });
    
    const totalBudget = budgets.reduce((sum, budget) => {
      return sum + budget.getMonthlyEquivalent();
    }, 0);
    
    const totalSpent = budgets.reduce((sum, budget) => sum + budget.spent, 0);
    const totalRemaining = totalBudget - totalSpent;
    
    // Calculate percentage spent for each budget
    const budgetsWithDetails = budgets.map(budget => ({
      ...budget.toObject(),
      percentageSpent: budget.getSpentPercentage(),
      remaining: budget.getRemaining(),
      monthlyEquivalent: budget.getMonthlyEquivalent(),
      isExceeded: budget.isExceeded()
    }));
    
    // Sort by category
    budgetsWithDetails.sort((a, b) => a.category.localeCompare(b.category));
    
    // Group budgets by status
    const exceededBudgets = budgetsWithDetails.filter(b => b.isExceeded);
    const warningBudgets = budgetsWithDetails.filter(b => b.percentageSpent >= 80 && !b.isExceeded);
    const goodBudgets = budgetsWithDetails.filter(b => b.percentageSpent < 80);
    
    res.json({
      summary: {
        totalBudget: totalBudget,
        totalSpent: totalSpent,
        totalRemaining: totalRemaining,
        currency: 'PKR',
        budgetCount: budgets.length
      },
      budgets: budgetsWithDetails,
      statusSummary: {
        exceeded: exceededBudgets.length,
        warning: warningBudgets.length,
        good: goodBudgets.length
      },
      analytics: {
        // Calculate what percentage of user's income is budgeted
        budgetToIncomeRatio: req.user.monthlyIncome > 0 
          ? (totalBudget / req.user.monthlyIncome) * 100 
          : 0,
        // Average spent percentage across all budgets
        averageSpentPercentage: budgets.length > 0 
          ? budgets.reduce((sum, b) => sum + b.getSpentPercentage(), 0) / budgets.length 
          : 0
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update spent amounts for budgets (call this when transactions are added/updated/deleted)
router.post('/update-spent', auth, async (req, res) => {
  try {
    const { userId } = req.user;
    
    // Get all active budgets
    const budgets = await Budget.find({ userId, isActive: true });
    
    // Update spent amounts for each budget
    for (const budget of budgets) {
      const startDate = budget.startDate;
      const endDate = new Date(startDate);
      
      // Calculate end date based on period
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
      
      // Get transactions for this budget period and category
      const transactions = await Transaction.find({
        userId,
        category: budget.category,
        type: 'expense',
        date: { $gte: startDate, $lt: endDate }
      });
      
      // Calculate total spent
      const totalSpent = transactions.reduce((sum, transaction) => sum + transaction.amount, 0);
      
      // Update budget
      budget.spent = totalSpent;
      await budget.save();
    }
    
    res.json({ 
      success: true, 
      message: 'Budget spent amounts updated',
      updatedBudgets: budgets.length 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get budget analytics
router.get('/analytics', auth, async (req, res) => {
  try {
    const budgets = await Budget.find({ 
      userId: req.user._id,
      isActive: true 
    });
    
    if (budgets.length === 0) {
      return res.json({
        message: 'No active budgets found',
        analytics: null
      });
    }
    
    // Calculate category distribution
    const categoryDistribution = budgets.reduce((acc, budget) => {
      const monthlyEquivalent = budget.getMonthlyEquivalent();
      acc[budget.category] = (acc[budget.category] || 0) + monthlyEquivalent;
      return acc;
    }, {});
    
    // Convert to array for easier consumption
    const categoryData = Object.entries(categoryDistribution).map(([category, amount]) => ({
      category,
      amount
    })).sort((a, b) => b.amount - a.amount);
    
    // Calculate spending efficiency
    const totalMonthlyBudget = budgets.reduce((sum, budget) => sum + budget.getMonthlyEquivalent(), 0);
    const totalSpent = budgets.reduce((sum, budget) => sum + budget.spent, 0);
    const spendingEfficiency = totalMonthlyBudget > 0 ? (totalSpent / totalMonthlyBudget) * 100 : 0;
    
    // Identify top spending categories
    const topSpendingCategories = budgets
      .map(budget => ({
        category: budget.category,
        spent: budget.spent,
        limit: budget.limit,
        percentage: budget.getSpentPercentage()
      }))
      .sort((a, b) => b.spent - a.spent)
      .slice(0, 5);
    
    res.json({
      analytics: {
        totalBudgets: budgets.length,
        totalMonthlyBudget,
        totalSpent,
        spendingEfficiency,
        currency: 'PKR',
        categoryDistribution: categoryData,
        topSpendingCategories,
        budgetHealth: {
          exceeded: budgets.filter(b => b.isExceeded()).length,
          warning: budgets.filter(b => b.getSpentPercentage() >= 80 && !b.isExceeded()).length,
          good: budgets.filter(b => b.getSpentPercentage() < 80).length
        }
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;