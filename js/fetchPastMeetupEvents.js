function getEventsEdges(groupData, type) {
    const isPast = type === 'past';
    const prefix = isPast ? 'events({"filter":{"beforeDateTime":' : 'events({"filter":{"afterDateTime"';

    // Iterate over object keys to find the matching key
    for (const key in groupData) {
        if (key.startsWith(prefix)) {
            return groupData[key]?.edges || [];
        }
    }

    // Return an empty array if no matching key is found
    return [];
}

window.fetchAndParseMeetupEvents = async function (groupUrlname, type) {
    try {

        const response = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(`https://www.meetup.com/${groupUrlname}/events/?type=${type}`)}`)
        const htmlContent = await response.text()

        // Parse the HTML content
        function parseMeetupEvents(htmlContent) {
            try {
                // Extract JSON data from the __NEXT_DATA__ script tag
                const jsonMatch = htmlContent.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s);
                if (!jsonMatch) {
                    throw new Error("Could not find __NEXT_DATA__ script tag");
                }

                const jsonData = JSON.parse(jsonMatch[1]);
                const apolloState = jsonData.props.pageProps.__APOLLO_STATE__;


                // Find the Group entry in apolloState
                const groupKey = Object.keys(apolloState).find(key => {
                    return key.startsWith('Group:') &&
                        apolloState[key].__typename === 'Group' &&
                        apolloState[key]?.urlname?.toLowerCase() === groupUrlname?.toLowerCase()
                });

                if (!groupKey) {
                    throw new Error(`Could not find group data for ${groupUrlname}`);
                }

                const groupData = apolloState[groupKey];

                // Map the events to a simpler format
                const events = getEventsEdges(groupData, type).map(edge => {
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

                return events;
            } catch (error) {
                console.error('Error parsing Meetup events:', error);
                return [];
            }
        }

        const events = parseMeetupEvents(htmlContent);
        return events;

    } catch (error) {
        console.error('Error fetching Meetup events:', error);
        return [];
    }
}
