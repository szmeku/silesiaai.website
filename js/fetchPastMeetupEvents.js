async function fetchMeetupData(groupUrlname, type = '') {
    try {
        const corsProxy = 'https://proxy.cors.sh/';
        const eventsUrl = `https://www.meetup.com/${groupUrlname}/events/?type=${type}`
        // const url = `${corsProxy}${eventsUrl}`;
        const url = eventsUrl;

        const response = await fetch(url, {
            headers: {
                'Accept': 'text/html',
                // 'x-cors-api-key': 'temp_f547be1c3f7a7266c0ecad11a1269550',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.text();
    } catch (error) {
        console.error('Error fetching Meetup data:', error);
        throw error;
    }
}

function findEventsKey(groupData, type = 'past') {
    // Find all keys that start with 'events('
    const eventKeys = Object.keys(groupData).filter(key => key.startsWith('events('));

    if (type === 'past') {
        return eventKeys.find(key =>
            key.includes('PAST')
        );
    } else {
        // For upcoming events, look for ACTIVE or UPCOMING status
        return eventKeys.find(key =>
            (key.includes('"status":["ACTIVE"') || key.includes('"status":["UPCOMING"]')) &&
            key.includes('"sort":"ASC"')
        );
    }
}

function parseMeetupEvents(htmlContent, groupUrlname, type = 'past') {
    try {
        const jsonMatch = htmlContent.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s);
        if (!jsonMatch) {
            throw new Error("Could not find __NEXT_DATA__ script tag");
        }

        const jsonData = JSON.parse(jsonMatch[1]);
        const apolloState = jsonData.props.pageProps.__APOLLO_STATE__;

        const groupKey = Object.keys(apolloState).find(key => {
            return key.startsWith('Group:') &&
                apolloState[key].__typename === 'Group' &&
                apolloState[key]?.urlname?.toLowerCase() === groupUrlname?.toLowerCase();
        });

        if (!groupKey) {
            throw new Error(`Could not find group data for ${groupUrlname}`);
        }

        const groupData = apolloState[groupKey];

        // Find the correct events key dynamically
        const eventsKey = findEventsKey(groupData, type);
        if (!eventsKey) {
            throw new Error(`Could not find ${type} events key in response`);
        }

        const eventEdges = groupData[eventsKey]?.edges || [];

        return eventEdges.map(edge => {
            const eventRef = edge.node.__ref;
            const eventData = apolloState[eventRef];

            return {
                id: eventData.id,
                title: eventData.title,
                url: eventData.eventUrl,
                description: eventData.description,
                dateTime: new Date(eventData.dateTime),
                endTime: new Date(eventData.endTime),
                venue: apolloState[eventData.venue?.__ref],
                totalAttendees: eventData.going?.totalCount,
                isOnline: eventData.isOnline,
                status: eventData.status
            };
        });
    } catch (error) {
        console.error('Error parsing Meetup events:', error);
        return [];
    }
}

const fetchUpcomingMeetupEvents = async function(groupUrlname) {
    try {
        const htmlContent = await fetchMeetupData(groupUrlname);
        return parseMeetupEvents(htmlContent, groupUrlname, 'upcoming');
    } catch (error) {
        console.error('Error fetching upcoming events:', error);
        return [];
    }
}

const fetchPastMeetupEvents = async function(groupUrlname) {
    try {
        const htmlContent = await fetchMeetupData(groupUrlname);
        return parseMeetupEvents(htmlContent, groupUrlname, 'past');
    } catch (error) {
        console.error('Error fetching upcoming events:', error);
        return [];
    }
}
// fetchUpcomingMeetupEvents('london-startup-idea-to-ipo').then(console.log)
fetchPastMeetupEvents('silesia-ai').then(console.log)



//
// 'silesia-ai'


// fetchAndParseMeetupEvents()
//     .then(events => {
//         console.log('Found', events.length, 'events');
//         events.forEach(event => {
//             console.log(`\n${event.title}`);
//             console.log(`Date: ${event.dateTime.toLocaleString()}`);
//             console.log(`Location: ${event.venue?.name}, ${event.venue?.city}`);
//             console.log(`Attendees: ${event.totalAttendees}`);
//             console.log(`URL: ${event.url}`);
//         });
//     })
//     .catch(error => {
//         console.error('Failed to fetch and parse events:', error);
//     });