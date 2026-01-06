const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: [
      'Food', 'Transportation', 'Housing', 'Entertainment',
      'Healthcare', 'Education', 'Shopping', 'Utilities',
      'Personal Care', 'Debt Payments', 'Savings', 'Investments', 'Other'
    ]
  },
  limit: {
    type: Number,
    required: true,
    min: 1,
    default: 0,
    set: function(value) {
      // Ensure PKR amounts are integers or rounded to 2 decimals
      return Math.round(value * 100) / 100;
    },
    get: function(value) {
      return Math.round(value * 100) / 100;
    }
  },
  spent: {
    type: Number,
    default: 0,
    min: 0,
    set: function(value) {
      return Math.round(value * 100) / 100;
    },
    get: function(value) {
      return Math.round(value * 100) / 100;
    }
  },
  period: {
    type: String,
    required: true,
    enum: ['weekly', 'monthly', 'yearly'],
    default: 'monthly'
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date
  },
  currency: {
    type: String,
    default: 'PKR',
    enum: ['PKR']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  notifications: {
    type: Boolean,
    default: true
  },
  warningThreshold: {
    type: Number,
    default: 80, // Percentage
    min: 0,
    max: 100
  }
}, {
  timestamps: true,
  toJSON: { getters: true },
  toObject: { getters: true }
});

// Method to check if budget is exceeded
budgetSchema.methods.isExceeded = function() {
  return this.spent > this.limit;
};

// Method to get remaining amount
budgetSchema.methods.getRemaining = function() {
  return this.limit - this.spent;
};

// Method to get spent percentage
budgetSchema.methods.getSpentPercentage = function() {
  if (this.limit === 0) return 0;
  return (this.spent / this.limit) * 100;
};

// Method to get monthly equivalent
budgetSchema.methods.getMonthlyEquivalent = function() {
  switch (this.period) {
    case 'weekly':
      return this.limit * 4.33; // Average weeks in a month
    case 'yearly':
      return this.limit / 12;
    default:
      return this.limit;
  }
};

// Middleware to auto-reset monthly budgets
budgetSchema.pre('save', function(next) {
  if (this.period === 'monthly') {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // If this is an existing document and startDate is before current month, reset spent
    if (this.isModified('spent') && this.startDate < startOfMonth) {
      this.startDate = startOfMonth;
      this.spent = 0;
    }
  }
  next();
});

const Budget = mongoose.model('Budget', budgetSchema);

module.exports = Budget;