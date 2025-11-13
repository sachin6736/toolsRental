import mongoose from 'mongoose';

const rentalSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  tools: [
    {
      tool: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tools',
        required: true,     
      },
      count: {     
        type: Number,
        required: true,
        min: 1,
      },
      returnedCount: {
        type: Number,
        default: 0,
        min: 0,
      },
      price: {
        type: Number,
        required: true,
      },
      rentalDate: {
        type: Date,
        default: Date.now,
      },
      returnDates: [
        {
          count: {
            type: Number,
            required: true,
            min: 1,
          },
          date: {
            type: Date,
            required: true,
          },
        },
      ],
    },
  ],
  initialAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  status: {
    type: String,
    enum: ['rented', 'partial return', 'return completed'],
    default: 'rented',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  notes: [
    {
      text: {
        type: String,
        required: true,
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  discounts: [
    {
      toolId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tools',
      },
      amount: {
        type: Number,
        required: true,
        min: 0,
      },
      returnDate: {
        type: Date,
        required: true,
      },
      note: {
        type: String,
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  credits: [
    {
      toolId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tools',
      },
      amount: {
        type: Number,
        required: true,
        min: 0,
      },
      returnDate: {
        type: Date,
        required: true,
      },
      note: {
        type: String,
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
});

const Rental = mongoose.model('Rental', rentalSchema);
export default Rental;