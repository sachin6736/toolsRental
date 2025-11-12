// import mongoose from 'mongoose';
// import User from '../models/user.js';
// import Rental from '../models/rental.js';

// const migrateOrderHistory = async () => {
//   try {
//     // Connect to MongoDB
//     await mongoose.connect('mongodb://localhost:27017/thallalproject', {
//       useNewUrlParser: true,
//       useUnifiedTopology: true,
//     });
//     console.log('Connected to MongoDB');

//     // Find all users
//     const users = await User.find({});
//     console.log(`Found ${users.length} users`);

//     for (const user of users) {
//       // Find all rentals for this user
//       const rentals = await Rental.find({ user: user._id });

//       // Update user's orderHistory with rental IDs
//       user.orderHistory = rentals.map(rental => rental._id);

//       // Save the updated user
//       await user.save();
//       console.log(`Updated orderHistory for user ${user.name} (${user._id}) with ${rentals.length} rentals`);
//     }

//     console.log('Migration completed successfully');
//   } catch (error) {
//     console.error('Migration error:', error);
//   } finally {
//     // Close the database connection
//     await mongoose.connection.close();
//     console.log('Database connection closed');
//   }
// };

// // Run the migration
// migrateOrderHistory();
//============================================
// import mongoose from 'mongoose';
// import User from '../models/user.js';
// import Rental from '../models/rental.js';

// const migrateCredits = async () => {
//   try {
//     // Connect to MongoDB
//     await mongoose.connect('mongodb://localhost:27017/thallalproject', {
//       useNewUrlParser: true,
//       useUnifiedTopology: true,
//     });
//     console.log('Connected to MongoDB');

//     // Migrate User collection
//     console.log('Migrating User collection...');
//     const users = await User.find({});
//     console.log(`Found ${users.length} users`);

//     let userUpdateCount = 0;
//     for (const user of users) {
//       // Check if credits or totalCredit fields are missing
//       if (!user.credits || user.totalCredit === undefined) {
//         user.credits = user.credits || [];
//         user.totalCredit = user.totalCredit || 0;
//         await user.save();
//         userUpdateCount++;
//         console.log(`Updated user ${user.name} (${user._id}) with credits and totalCredit`);
//       }
//     }
//     console.log(`Updated ${userUpdateCount} User documents`);

//     // Migrate Rental collection
//     console.log('Migrating Rental collection...');
//     const rentals = await Rental.find({});
//     console.log(`Found ${rentals.length} rentals`);

//     let rentalUpdateCount = 0;
//     for (const rental of rentals) {
//       // Check if credits field is missing
//       if (!rental.credits) {
//         rental.credits = [];
//         await rental.save();
//         rentalUpdateCount++;
//         console.log(`Updated rental (${rental._id}) with credits`);
//       }
//     }
//     console.log(`Updated ${rentalUpdateCount} Rental documents`);

//     console.log('Migration completed successfully');
//   } catch (error) {
//     console.error('Migration error:', error);
//   } finally {
//     // Close the database connection
//     await mongoose.connection.close();
//     console.log('Database connection closed');
//   }
// };

// // Run the migration
// migrateCredits();

import mongoose from 'mongoose';
import Rental from '../models/rental.js';
import Tools from '../models/tools.js'; // Import the Tools model

const migrateInitialAmount = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/thallalproject', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Migrate Rental collection
    console.log('Migrating Rental collection...');
    const rentals = await Rental.find({}).populate('tools.tool', 'price');
    console.log(`Found ${rentals.length} rentals`);

    let updateCount = 0;
    for (const rental of rentals) {
      // Check if initialAmount is missing
      if (rental.initialAmount === undefined) {
        // Calculate initialAmount as sum of count * price for each tool
        let initialAmount = 0;
        for (const toolEntry of rental.tools) {
          const price = toolEntry.price || (toolEntry.tool ? toolEntry.tool.price : 0);
          initialAmount += toolEntry.count * price;
        }
        rental.initialAmount = initialAmount;
        await rental.save();
        updateCount++;
        console.log(`Updated rental (${rental._id}) with initialAmount: ₹${initialAmount.toFixed(2)}`);
      }
    }
    console.log(`Updated ${updateCount} Rental documents`);

    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    // Close the database connection
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
};

// Run the migration
migrateInitialAmount();