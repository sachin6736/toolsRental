import mongoose from 'mongoose';

const toolsSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true,
  },
  count: { 
    type: Number, 
    min: 0,
    validate: {
      validator: function (value) {
        // Count is required only for Power Tools; for Accessories, it can be undefined or null
        return this.category === 'Power Tools' ? Number.isInteger(value) && value >= 0 : true;
      },
      message: 'Count is required for Power Tools and must be a non-negative integer',
    },
  },
  price: { 
    type: Number, 
    required: true,
    min: 0,
  },   
  image: { 
    type: String, 
    required: false, // Image is optional
  },
  category: {
    type: String,
    required: true,
    enum: ['Power Tools', 'Accessories'],
    default: 'Power Tools',
  },
}, {
  timestamps: true,
});

const Tools = mongoose.model('Tools', toolsSchema);
export default Tools;