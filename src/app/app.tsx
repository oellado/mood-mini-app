"use client";
import React, { useState, useEffect } from 'react';
import './App.css';
import axios from 'axios';
import { sdk } from '@farcaster/frame-sdk';

function App() {
  const [result, setResult] = useState('');
  const [songLink, setSongLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [pfpUrl, setPfpUrl] = useState<string | null>(null);

  const moodFiles = {
    'Feel Good': 'https://raw.githubusercontent.com/oellado/mood/refs/heads/main/Data/chill.txt',
    Nostalgic: 'https://raw.githubusercontent.com/oellado/mood/refs/heads/main/Data/melancholy.txt',
    Energetic: 'https://raw.githubusercontent.com/oellado/mood/refs/heads/main/Data/energetic.txt',
  };

  const getMood = async (moodKey: keyof typeof moodFiles | 'Random') => {
    setLoading(true);
    setResult('');
    setSongLink('');
    const minSpinner = new Promise((resolve) => setTimeout(resolve, 700));
    let maxSpinner: NodeJS.Timeout | null = null;
    let finished = false;
    try {
      maxSpinner = setTimeout(() => {
        if (!finished) setLoading(false);
      }, 1200);
      let selectedMood: keyof typeof moodFiles;
      if (moodKey === 'Random') {
        const moods = Object.keys(moodFiles) as (keyof typeof moodFiles)[];
        selectedMood = moods[Math.floor(Math.random() * moods.length)];
      } else {
        selectedMood = moodKey;
      }

      const response = await axios.get(moodFiles[selectedMood]);
      const lines = response.data.trim().split('\n');

      const tracks = lines.map((line: string) => {
        const [name, artist] = line.split(',').map((s: string) => s.trim());
        return { name, artist };
      });

      if (tracks.length === 0) {
        throw new Error(`No tracks found for mood: ${selectedMood}`);
      }

      const track = tracks[Math.floor(Math.random() * tracks.length)];

      const searchTerm = encodeURIComponent(`${track.artist} ${track.name}`);
      const iTunesResponse = await axios.get(`https://itunes.apple.com/search?term=${searchTerm}&entity=song&limit=1`);
      const iTunesData = iTunesResponse.data;
      if (!iTunesData.results || iTunesData.results.length === 0) {
        throw new Error('Song not found on iTunes');
      }
      const appleUrl = iTunesData.results[0].trackViewUrl;

      const songLinkResponse = await axios.get('https://api.song.link/v1-alpha.1/links', {
        params: { url: appleUrl },
      });
      const songLinkUrl = songLinkResponse.data.pageUrl;
      if (!songLinkUrl) {
        throw new Error('No Song.link URL returned');
      }

      console.log('Embed URL:', `https://embed.odesli.co/?url=${encodeURIComponent(songLinkUrl)}&theme=dark`);

      setResult(
        `Your MOOD today is <span class="result-mood">${selectedMood.toUpperCase()}</span><div>Song: ${track.name} by ${track.artist}</div>`
      );
      setSongLink(songLinkUrl);
    } catch {
      setResult('An unknown error occurred. Please try again.');
    }
    finished = true;
    if (maxSpinner) clearTimeout(maxSpinner);
    await minSpinner;
    setLoading(false);
  };

  const shareResult = async () => {
    if (!songLink) return;
    try {
      const mood = result.match(/is (.*?)</)?.[1] || 'unknown';
      const songMatch = result.match(/Song: (.*?)<br>/)?.[1];
      const artistMatch = result.match(/by (.*)$/);
      const song = songMatch || 'a song';
      const artist = artistMatch ? ` by ${artistMatch[1]}` : '';
      await sdk.actions.composeCast({
        text: `My mood today is ${mood}! Listening to ${song}${artist}. Check it out: https://mood-randomizer.vercel.app`,
        embeds: [songLink],
      });
      catch {
        // ...same code, or nothing
      }
  };

  const tryAgain = () => {
    setResult('');
    setSongLink('');
  };

  const goHome = () => {
    setResult('');
    setSongLink('');
  };

  useEffect(() => {
    sdk.actions.ready();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const context = await sdk.context;
        if (context && context.user && context.user.pfpUrl) {
          setPfpUrl(context.user.pfpUrl);
        }
      } catch {}
    })();
  }, []);

  return (
    <div className="App">
      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
        </div>
      ) : songLink ? (
        <div className="result-screen">
          <div className="top-bar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h1 onClick={goHome} style={{ cursor: 'pointer' }}>Mood</h1>
            <div style={{ marginRight: 16 }}>
              {pfpUrl ? (
                <img src={pfpUrl} alt="pfp" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: '2px solid #fff', background: '#9876FF' }} />
              ) : (
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#ccc', display: 'inline-block' }} />
              )}
            </div>
          </div>
          <div className="content">
            <div className="result-text" dangerouslySetInnerHTML={{ __html: result }} />
            <div className="embed-container">
              <iframe
                src={`https://embed.odesli.co/?url=${encodeURIComponent(songLink)}&theme=dark`}
                width="100%"
                height="100%"
                frameBorder="0"
                allow="encrypted-media; clipboard-write"
                sandbox="allow-same-origin allow-scripts allow-presentation allow-popups allow-popups-to-escape-sandbox"
                className="songlink-embed"
                scrolling="no"
              ></iframe>
            </div>
            <div className="button-container">
              <button onClick={shareResult}>Share</button>
              <button onClick={tryAgain}>Try Again</button>
            </div>
          </div>
          <div className="footer">
            Mood-based songs, curated by 
            <a href="https://farcaster.xyz/janicka" target="_blank" rel="noopener noreferrer" style={{ color: 'white', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              @janicka.eth
              <span style={{ display: 'inline-block', verticalAlign: 'middle', marginLeft: 2 }}>
                <svg width="18" height="18" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8.2489 4.97778H23.7511V27.0222H21.4756V16.9244H21.4533C21.2017 14.1337 18.8563 11.9466 16 11.9466C13.1437 11.9466 10.7983 14.1337 10.5468 16.9244H10.5245V27.0222H8.2489V4.97778Z" fill="white"/>
                  <path d="M4.12445 8.10669L5.0489 11.2356H5.83111V23.8934C5.43837 23.8934 5.12 24.2117 5.12 24.6045V25.4578H4.97779C4.58506 25.4578 4.26666 25.7762 4.26666 26.1689V27.0223H12.2311V26.1689C12.2311 25.7762 11.9127 25.4578 11.52 25.4578H11.3778V24.6045C11.3778 24.2117 11.0594 23.8934 10.6667 23.8934H9.81335V8.10669H4.12445Z" fill="white"/>
                  <path d="M21.6178 23.8934C21.2251 23.8934 20.9067 24.2117 20.9067 24.6045V25.4578H20.7644C20.3717 25.4578 20.0533 25.7762 20.0533 26.1689V27.0223H28.0178V26.1689C28.0178 25.7762 27.6994 25.4578 27.3067 25.4578H27.1644V24.6045C27.1644 24.2117 26.8461 23.8934 26.4533 23.8934V11.2356H27.2356L28.16 8.10669H22.4711V23.8934H21.6178Z" fill="white"/>
                </svg>
              </span>
            </a>
          </div>
        </div>
      ) : (
        <div className="home-screen">
          <div className="top-bar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h1 onClick={goHome} style={{ cursor: 'pointer' }}>Mood</h1>
            <div style={{ marginRight: 16 }}>
              {pfpUrl ? (
                <img src={pfpUrl} alt="pfp" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: '2px solid #fff', background: '#9876FF' }} />
              ) : (
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#ccc', display: 'inline-block' }} />
              )}
            </div>
          </div>
          <div className="button-container">
            <button onClick={() => getMood('Feel Good')}>Feel Good</button>
            <button onClick={() => getMood('Nostalgic')}>Nostalgic</button>
            <button onClick={() => getMood('Energetic')}>Energetic</button>
            <button onClick={() => getMood('Random')}>Random</button>
          </div>
          <div className="footer">
            Mood-based songs, curated by 
            <a href="https://farcaster.xyz/janicka.eth" target="_blank" rel="noopener noreferrer" style={{ color: 'white', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              @janicka.eth
              <span style={{ display: 'inline-block', verticalAlign: 'middle', marginLeft: 2 }}>
                <svg width="18" height="18" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8.2489 4.97778H23.7511V27.0222H21.4756V16.9244H21.4533C21.2017 14.1337 18.8563 11.9466 16 11.9466C13.1437 11.9466 10.7983 14.1337 10.5468 16.9244H10.5245V27.0222H8.2489V4.97778Z" fill="white"/>
                  <path d="M4.12445 8.10669L5.0489 11.2356H5.83111V23.8934C5.43837 23.8934 5.12 24.2117 5.12 24.6045V25.4578H4.97779C4.58506 25.4578 4.26666 25.7762 4.26666 26.1689V27.0223H12.2311V26.1689C12.2311 25.7762 11.9127 25.4578 11.52 25.4578H11.3778V24.6045C11.3778 24.2117 11.0594 23.8934 10.6667 23.8934H9.81335V8.10669H4.12445Z" fill="white"/>
                  <path d="M21.6178 23.8934C21.2251 23.8934 20.9067 24.2117 20.9067 24.6045V25.4578H20.7644C20.3717 25.4578 20.0533 25.7762 20.0533 26.1689V27.0223H28.0178V26.1689C28.0178 25.7762 27.6994 25.4578 27.3067 25.4578H27.1644V24.6045C27.1644 24.2117 26.8461 23.8934 26.4533 23.8934V11.2356H27.2356L28.16 8.10669H22.4711V23.8934H21.6178Z" fill="white"/>
                </svg>
              </span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;