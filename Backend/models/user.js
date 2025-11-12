import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: false,
  },
  adress: {
    type: String,
    required: false,
    unique: false,
  },
  phone: {
    type: String,
    required: true,
    unique: true,
  },
  aadhar: {
    type: String,
    required: false,
    unique: true,
    sparse: true,
  },
  aadharImage: {
    type: String,
    required: false,
  },
  profession: {
    type: String,
    required: false,
    unique: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  orderHistory: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Rental',
    },
  ],
  credits: [
    {
      rentalId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Rental',
        required: true,
      },
      amount: {
        type: Number,
        required: true,
        min: 0,
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
      note: {
        type: String,
      },
    },
  ],
  totalCredit: {
    type: Number,
    default: 0,
    min: 0,
  },
});

// Explicitly define the sparse index for aadhar
userSchema.index({ aadhar: 1 }, { sparse: true, unique: true });

const User = mongoose.model('User', userSchema);
export default User;