const calculateScore = (user, target) => {
    let score = 0;

    // A. Interests (40%)
    const commonInterests = target.interests.filter(i => user.interests.includes(i));
    const interestScore = user.interests.length > 0
        ? (commonInterests.length / Math.max(user.interests.length, 1)) * 40
        : 0;
    score += interestScore;

    // B. Location (30%)
    let locationScore = 0;
    let distanceKm = null;
    if (user.latitude !== null && user.longitude !== null && target.latitude !== null && target.longitude !== null) {
        const R = 6371;
        const dLat = (target.latitude - user.latitude) * Math.PI / 180;
        const dLon = (target.longitude - user.longitude) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(user.latitude * Math.PI / 180) * Math.cos(target.latitude * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        distanceKm = R * c;
        locationScore = Math.max(0, (1 - distanceKm / 50) * 30);
    }
    score += locationScore;

    // C. Availability (20%)
    let availabilityScore = 0;
    if (user.availability?.days && target.availability?.days) {
        const overlappingDays = user.availability.days.filter(d => target.availability.days.includes(d));
        const overlappingTimes = (user.availability.times || []).filter(t => (target.availability.times || []).includes(t));
        const dayMatch = (overlappingDays.length / Math.max(user.availability.days.length, 1));
        const timeMatch = (overlappingTimes.length / Math.max(user.availability.times?.length || 1, 1));
        availabilityScore = (dayMatch * 10) + (timeMatch * 10);
    }
    score += availabilityScore;

    // D. Style (10%)
    const styleScore = target.friendshipStyle === user.friendshipStyle ? 10 : 0;
    score += styleScore;

    return { score: Math.round(score), distanceKm, sharedInterests: commonInterests };
};

const mockUser = {
    interests: ['Coffee', 'Reading', 'Hiking'],
    latitude: 35.6895, // Tokyo
    longitude: 139.6917,
    availability: { days: ['Sat', 'Sun'], times: ['Afternoon', 'Evening'] },
    friendshipStyle: 'one-on-one'
};

const mockTargets = [
    {
        name: 'Perfect Match',
        interests: ['Coffee', 'Reading', 'Hiking'],
        latitude: 35.69,
        longitude: 139.70,
        availability: { days: ['Sat', 'Sun'], times: ['Afternoon', 'Evening'] },
        friendshipStyle: 'one-on-one'
    },
    {
        name: 'Nearby but no shared interests',
        interests: ['Gaming', 'Anime'],
        latitude: 35.68,
        longitude: 139.69,
        availability: { days: ['Mon'], times: ['Morning'] },
        friendshipStyle: 'small-group'
    },
    {
        name: 'Far away but shared interests',
        interests: ['Coffee', 'Reading', 'Hiking'],
        latitude: 34.69, // Osaka
        longitude: 135.50,
        availability: { days: ['Sat', 'Sun'], times: ['Afternoon', 'Evening'] },
        friendshipStyle: 'one-on-one'
    }
];

console.log('--- Matching Engine Verification ---');
mockTargets.forEach(target => {
    const result = calculateScore(mockUser, target);
    console.log(`\nTarget: ${target.name}`);
    console.log(`Score: ${result.score}%`);
    console.log(`Distance: ${result.distanceKm ? result.distanceKm.toFixed(2) : 'N/A'}km`);
    console.log(`Shared Interests: ${result.sharedInterests.join(', ') || 'None'}`);
});
