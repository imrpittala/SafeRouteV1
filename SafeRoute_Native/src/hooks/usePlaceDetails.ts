import { useState, useEffect } from 'react';
import axios from 'axios';

interface PlaceDetails {
  placeName: string;
  description: string;
}

interface UsePlaceDetailsResult {
  isLoading: boolean;
  error: string | null;
  data: PlaceDetails | null;
}

export const usePlaceDetails = (coordinate: number[] | null): UsePlaceDetailsResult => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PlaceDetails | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchDetails = async () => {
      if (!coordinate || coordinate.length < 2) {
        setData(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const [lng, lat] = coordinate;
        const mapboxToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || 'MAPBOX_PUBLIC_TOKEN_PLACEHOLDER';
        
        // 1. Reverse Geocoding with Mapbox
        const geocodingUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxToken}`;
        const geocodingRes = await axios.get(geocodingUrl);
        
        let placeName = '';
        let extractedPlaceForWiki = '';
        
        if (geocodingRes.data.features && geocodingRes.data.features.length > 0) {
          placeName = geocodingRes.data.features[0].place_name;
          // Extract a simpler name for Wikipedia search (e.g. city or landmark)
          // Mapbox features usually have 'text' for the main name.
          extractedPlaceForWiki = geocodingRes.data.features[0].text;
        } else {
          throw new Error('No place found for these coordinates.');
        }

        // 2. Fetch from Wikipedia
        let description = 'No further details available for this location.';
        if (extractedPlaceForWiki) {
          try {
            const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(extractedPlaceForWiki)}`;
            const wikiRes = await axios.get(wikiUrl);
            
            if (wikiRes.data && wikiRes.data.extract) {
              description = wikiRes.data.extract;
            }
          } catch (wikiErr) {
            console.warn('Wikipedia API error:', wikiErr);
            // Non-fatal error, we still have the placeName
          }
        }

        if (isMounted) {
          setData({
            placeName,
            description
          });
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Failed to fetch place details.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchDetails();

    return () => {
      isMounted = false;
    };
  }, [coordinate]);

  return { isLoading, error, data };
};
