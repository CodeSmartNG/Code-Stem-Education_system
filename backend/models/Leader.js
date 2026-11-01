import mongoose from 'mongoose';

const leaderSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    title: { type: String, required: true },
    imageUrl: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.model('Leader', leaderSchema);
