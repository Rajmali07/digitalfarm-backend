const service = require('./service');

exports.getFarmProfile = async (req, res) => {
  try {
    const profile = req.user || {};
    const userId = profile.id;

    if (!userId) {
      throw new Error('Authenticated farmer profile not found');
    }

    // Get real animal stats
    const stats = await service.getFarmStats(userId);

    const locationLabel = [
      profile?.village,
      profile?.district,
      profile?.state
    ].filter(Boolean).join(', ') || profile?.address || 'Location Not Set';

    // Combine real data
    const farm = {
      farmName: profile?.farm_name || 'Farm Profile Pending',
      farmType: profile?.farm_type || profile?.livestock_category || (stats.animalTypes > 0 ? 'Multi-Livestock' : 'New Farm Setup'),
      location: locationLabel,
      activeUnits: stats.activeUnits,
      animalTypes: stats.animalTypes
    };

    res.json({
      success: true,
      data: farm
    });

  } catch (err) {
    console.error('Farm Profile Error:', err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};
