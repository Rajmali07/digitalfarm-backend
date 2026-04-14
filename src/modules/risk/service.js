// Stub for risk
const getRiskAssessment = async (userId) => {
  return {
    overallRisk: 'medium',
    factors: ['weather', 'biosecurity']
  };
};

module.exports = { getRiskAssessment };

