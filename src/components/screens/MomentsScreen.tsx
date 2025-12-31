import { useState, useEffect, useRef } from 'react';
import { historicalMoments, HistoricalMoment } from '../../data/moments';

// Mist fade text - appears, then slowly dissolves into mist and stays gone
function MistFadeText({
  text,
  style = {},
  appearDuration = 2000,
  visibleDuration = 8000,
  fadeDuration = 4000,
  initialX = 50,
  initialY = 50,
}: {
  text: string;
  style?: React.CSSProperties;
  appearDuration?: number;
  visibleDuration?: number;
  fadeDuration?: number;
  initialX?: number;
  initialY?: number;
}) {
  const [phase, setPhase] = useState<'appearing' | 'visible' | 'fading' | 'gone'>('appearing');
  const [progress, setProgress] = useState(0);
  const startTimeRef = useRef<number>(0);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    startTimeRef.current = performance.now();

    const animate = (timestamp: number) => {
      const elapsed = timestamp - startTimeRef.current;

      if (elapsed < appearDuration) {
        setPhase('appearing');
        setProgress(elapsed / appearDuration);
      } else if (elapsed < appearDuration + visibleDuration) {
        setPhase('visible');
        setProgress(1);
      } else if (elapsed < appearDuration + visibleDuration + fadeDuration) {
        setPhase('fading');
        setProgress(1 - (elapsed - appearDuration - visibleDuration) / fadeDuration);
      } else {
        setPhase('gone');
        setProgress(0);
        return; // Stop animating
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [appearDuration, visibleDuration, fadeDuration]);

  if (phase === 'gone') return null;

  const eased = progress * progress * (3 - 2 * progress);

  // Mist effect during fade
  const blur = phase === 'fading' ? (1 - eased) * 15 : phase === 'appearing' ? (1 - eased) * 8 : 0;
  const drift = phase === 'fading' ? (1 - eased) * 20 : 0;
  const scale = phase === 'fading' ? 1 + (1 - eased) * 0.1 : 1;

  return (
    <div
      style={{
        position: 'absolute',
        left: `${initialX}%`,
        top: `${initialY}%`,
        transform: `translate(-50%, -50%) translateY(${-drift}px) scale(${scale})`,
        opacity: eased,
        filter: `blur(${blur}px)`,
        transition: 'none',
        ...style,
      }}
    >
      {text}
    </div>
  );
}

// Map keywords to Unsplash image IDs for reliable loading
const imageMap: Record<string, string> = {
  'space,astronaut': '1446776811953-b23d57bd21aa',
  'moon,space': '1614730321146-b6fa6a46bcb4',
  'earth,space': '1614730321146-b6fa6a46bcb4',
  'mars,space': '1614728263578-a5c3c5a8e6c0',
  'space,stars': '1419242902214-272b3f66ee7a',
  'telescope,stars': '1462331940025-496dfbfc7564',
  'telescope,galaxy': '1462331940025-496dfbfc7564',
  'rocket,space': '1517976384346-8dbf1ffd6de8',
  'space,station': '1446776858070-70c3d5ed6758',
  'mars,rover': '1614728894747-a83421e2b9c9',
  'mars,helicopter': '1614728894747-a83421e2b9c9',
  'medicine,science': '1576671081837-49000212a370',
  'dna,science': '1507413245164-6160d1a90c6f',
  'dna,genome': '1507413245164-6160d1a90c6f',
  'vaccine,medicine': '1584820927498-cfe5211fd8bf',
  'vaccine,science': '1584820927498-cfe5211fd8bf',
  'heart,medicine': '1530026405186-ed1f139313f8',
  'surgery,medicine': '1551190822-a9333d879b1f',
  'freedom,justice': '1569974507005-6dc61f97fb5c',
  'vote,women': '1529390079861-591f2bbae8a4',
  'speech,dream': '1591848478625-de43268e6fb8',
  'wall,freedom': '1560969184-10fe8719e047',
  'freedom,mandela': '1580060839134-75a5edca2e99',
  'vote,freedom': '1494172961521-33799ddd43a5',
  'vote,democracy': '1494172961521-33799ddd43a5',
  'vote,mandela': '1580060839134-75a5edca2e99',
  'rights,peace': '1569974507005-6dc61f97fb5c',
  'airplane,flight': '1436491865332-7a61a109cc05',
  'airplane,pilot': '1436491865332-7a61a109cc05',
  'airplane,atlantic': '1436491865332-7a61a109cc05',
  'airplane,woman': '1436491865332-7a61a109cc05',
  'internet,technology': '1526374965328-7f61d4dc18c5',
  'internet,web': '1526374965328-7f61d4dc18c5',
  'web,internet': '1526374965328-7f61d4dc18c5',
  'computer,technology': '1518770660439-4636190af475',
  'computer,apple': '1517694712202-14dd9538aa97',
  'phone,apple': '1510557880182-3d4d3cba35a5',
  'phone,mobile': '1511707171634-5f897ff02aa9',
  'phone,invention': '1523966211575-eb4a01e7dd51',
  'email,internet': '1526374965328-7f61d4dc18c5',
  'music,concert': '1501386761578-eac5c94b800a',
  'concert,music': '1501386761578-eac5c94b800a',
  'music,charity': '1501386761578-eac5c94b800a',
  'olympics,sports': '1461896836934-ffe607ba8211',
  'olympics,greece': '1461896836934-ffe607ba8211',
  'running,gold': '1552674605-db6ffd4facb5',
  'running,track': '1552674605-db6ffd4facb5',
  'running,sprint': '1552674605-db6ffd4facb5',
  'swimming,gold': '1530549387789-4c1017266635',
  'soccer,football': '1551958219-acbc608c6377',
  'soccer,worldcup': '1551958219-acbc608c6377',
  'soccer,women': '1551958219-acbc608c6377',
  'soccer,miracle': '1551958219-acbc608c6377',
  'basketball,jordan': '1546519638-68e109acd27d',
  'baseball,history': '1566577739112-5180d4bf9390',
  'baseball,cubs': '1566577739112-5180d4bf9390',
  'football,superbowl': '1560272564-c83b66b1ad12',
  'football,comeback': '1560272564-c83b66b1ad12',
  'nature,park': '1441974231531-c6227db76b6e',
  'earth,nature': '1451187580459-43490279c0fa',
  'earth,environment': '1451187580459-43490279c0fa',
  'climate,earth': '1451187580459-43490279c0fa',
  'whale,ocean': '1568430462989-44163eb1752f',
  'ocean,deep': '1559128010-7c1ad6e1b6a5',
  'ship,ocean': '1559128010-7c1ad6e1b6a5',
  'mountain,summit': '1464822759023-fed622ff2c3b',
  'books,library': '1481627834876-b7833e8f5570',
  'books,printing': '1481627834876-b7833e8f5570',
  'tower,paris': '1502602898657-3e91760cbb34',
  'bridge,golden': '1449034446853-66c86144b0ad',
  'bridge,brooklyn': '1513415277738-89b1e2e27fbd',
  'skyscraper,newyork': '1486325212027-8081e485255e',
  'tower,dubai': '1512453913323-0b8c94dfb4a5',
  'peace,treaty': '1569974507005-6dc61f97fb5c',
  'peace,freedom': '1569974507005-6dc61f97fb5c',
  'peace,handshake': '1521791055366-0d553872125f',
  'united,peace': '1569974507005-6dc61f97fb5c',
  'ai,robot': '1485827404703-89b55fcc595e',
  'protein,ai': '1485827404703-89b55fcc595e',
  'car,electric': '1593941707882-a56bbc25df48',
  'car,green': '1593941707882-a56bbc25df48',
  'car,automobile': '1449965408869-eaa3f722e40d',
  'car,ford': '1449965408869-eaa3f722e40d',
  'solar,energy': '1509391366360-2e959784a276',
  'train,steam': '1474487548417-781cb71495f3',
  'train,railroad': '1474487548417-781cb71495f3',
  'tunnel,train': '1474487548417-781cb71495f3',
  'school,education': '1503676260728-1c00da094a0b',
  'school,justice': '1503676260728-1c00da094a0b',
  'education,online': '1517694712202-14dd9538aa97',
  'education,children': '1503676260728-1c00da094a0b',
  'education,veterans': '1503676260728-1c00da094a0b',
  'children,help': '1488521099670-57c491f27086',
  'children,school': '1503676260728-1c00da094a0b',
  'help,humanitarian': '1469571486292-0ba58a3f068b',
  'help,relief': '1469571486292-0ba58a3f068b',
  'doctors,help': '1576671081837-49000212a370',
  'volunteer,peace': '1469571486292-0ba58a3f068b',
  'film,cinema': '1485846234645-a62644f84728',
  'movie,film': '1485846234645-a62644f84728',
  'movie,jazz': '1485846234645-a62644f84728',
  'movie,wizard': '1485846234645-a62644f84728',
  'television,broadcast': '1593078166897-c6d8a6a0d2b0',
  'television,color': '1593078166897-c6d8a6a0d2b0',
  'television,invention': '1593078166897-c6d8a6a0d2b0',
  'news,television': '1593078166897-c6d8a6a0d2b0',
  'video,youtube': '1611162616305-c69b3fa7fbe0',
  'social,facebook': '1611162618071-b39a2ec055fb',
  'social,twitter': '1611162616305-c69b3fa7fbe0',
  'photo,social': '1611162616305-c69b3fa7fbe0',
  'google,search': '1573804633927-bfcbcd909acd',
  'search,google': '1573804633927-bfcbcd909acd',
  'knowledge,wiki': '1481627834876-b7833e8f5570',
  'art,painting': '1579783902614-a3fb3927b6a5',
  'art,renaissance': '1579783902614-a3fb3927b6a5',
  'statue,liberty': '1485738422659-01c08e7dfb72',
  'pyramid,egypt': '1503177119275-0aa32b3a9368',
  'pyramid,museum': '1499856871958-5b9627545d1a',
  'museum,architecture': '1499856871958-5b9627545d1a',
  'opera,sydney': '1523482580672-f109ba8cb9be',
  'dam,water': '1559128010-7c1ad6e1b6a5',
  'canal,ship': '1559128010-7c1ad6e1b6a5',
  'science,astronomy': '1419242902214-272b3f66ee7a',
  'science,chemistry': '1532187863486-abf9dbad1b69',
  'science,woman': '1532187863486-abf9dbad1b69',
  'physics,newton': '1635070041078-e363dbe005cb',
  'atom,physics': '1635070041078-e363dbe005cb',
  'atom,science': '1635070041078-e363dbe005cb',
  'atom,energy': '1635070041078-e363dbe005cb',
  'particle,physics': '1635070041078-e363dbe005cb',
  'einstein,physics': '1635070041078-e363dbe005cb',
  'lightning,electricity': '1429552077091-836152271555',
  'lightbulb,bright': '1550751827-4bd374c3f58b',
  'laser,light': '1550751827-4bd374c3f58b',
  'electronics,chip': '1518770660439-4636190af475',
  'chip,electronics': '1518770660439-4636190af475',
  'microscope,science': '1576086213369-97a56873571b2',
  'radio,waves': '1598488035139-bdbb2231ce04',
  'radio,broadcast': '1598488035139-bdbb2231ce04',
  'camera,photo': '1452780212940-6f5c0d14d848',
  'camera,color': '1452780212940-6f5c0d14d848',
  'satellite,space': '1446776811953-b23d57bd21aa',
  'satellite,navigation': '1446776811953-b23d57bd21aa',
  'satellite,television': '1446776811953-b23d57bd21aa',
  'cloud,server': '1544197150-b99a580bb7a8',
  'network,computer': '1526374965328-7f61d4dc18c5',
  'mobile,network': '1526374965328-7f61d4dc18c5',
  'mobile,5g': '1526374965328-7f61d4dc18c5',
  'wireless,technology': '1526374965328-7f61d4dc18c5',
  'wifi,wireless': '1526374965328-7f61d4dc18c5',
  'tablet,apple': '1517694712202-14dd9538aa97',
  'bitcoin,digital': '1518544801976-3123725f07d4',
  'india,freedom': '1524492412937-b28074a5d7da',
  'africa,freedom': '1580060839134-75a5edca2e99',
  'france,freedom': '1502602898657-3e91760cbb34',
  'japan,rebuild': '1493780474015-ba834fd0ce2f',
  'city,rebuild': '1486325212027-8081e485255e',
  'rebuild,peace': '1486406146926-c627a92ad1ab',
  'factory,industry': '1486406146926-c627a92ad1ab',
  'house,building': '1486406146926-c627a92ad1ab',
  'snow,pole': '1489392191049-fc10c97e64b6',
  'antarctica,peace': '1489392191049-fc10c97e64b6',
  'eagle,bird': '1611689342806-0863700ce8e5',
  'eagle,nature': '1611689342806-0863700ce8e5',
  'bird,nature': '1444464666168-49d633b86797',
  'panda,nature': '1564349683136-77e08dba1ef7',
  'animals,protection': '1474511320723-9a56873571b2',
  'rainforest,nature': '1441974231531-c6227db76b6e',
  'canyon,nature': '1474044159687-1ee9f3a51722',
  'air,clean': '1558618666-fcd25c85cd64',
  'ozone,sky': '1558618666-fcd25c85cd64',
  'ozone,earth': '1451187580459-43490279c0fa',
  'plastic,green': '1558171813-01ed882c595c',
  'plastic,invention': '1558171813-01ed882c595c',
  'environment,protection': '1441974231531-c6227db76b6e',
  'food,organic': '1498837167922-ddd27525d352',
  'food,science': '1498837167922-ddd27525d352',
  'wheat,agriculture': '1500382017468-9049fed747ef',
  'milk,science': '1550583724-b2692b85b150',
  'medicine,hope': '1576671081837-49000212a370',
  'medicine,germs': '1576671081837-49000212a370',
  'medicine,insulin': '1576671081837-49000212a370',
  'medicine,victory': '1576671081837-49000212a370',
  'hope,progress': '1469571486292-0ba58a3f068b',
  'baby,science': '1489710437720-ebb67ec84dd2',
  'baby,medicine': '1489710437720-ebb67ec84dd2',
  'xray,medicine': '1559757175-5700dde675bc',
  'blood,medicine': '1576671081837-49000212a370',
  'face,surgery': '1551190822-a9333d879b1f',
  'doctor,woman': '1559757175-5700dde675bc',
  'justice,woman': '1589829545856-d10d557cf95f',
  'politics,woman': '1529390079861-591f2bbae8a4',
  'graduation,women': '1523580846011-d3a5bc25702b',
  'space,woman': '1446776811953-b23d57bd21aa',
  'space,women': '1446776811953-b23d57bd21aa',
  'space,rescue': '1446776811953-b23d57bd21aa',
  'space,tourist': '1446776811953-b23d57bd21aa',
  'hubble,space': '1462331940025-496dfbfc7564',
  'comet,space': '1419242902214-272b3f66ee7a',
  'pluto,space': '1419242902214-272b3f66ee7a',
  'blackhole,space': '1462331940025-496dfbfc7564',
  'planet,space': '1614730321146-b6fa6a46bcb4',
  'space,universe': '1462331940025-496dfbfc7564',
  'space,quasar': '1462331940025-496dfbfc7564',
  'document,history': '1481627834876-b7833e8f5570',
  'freedom,flag': '1569974507005-6dc61f97fb5c',
  'freedom,lincoln': '1569974507005-6dc61f97fb5c',
  'greece,democracy': '1555952238-f0d72d0b6b8c',
  'evolution,nature': '1441974231531-c6227db76b6e',
  'sheep,science': '1484557985045-4f8b6a68b2f0',
  'steam,engine': '1474487548417-781cb71495f3',
  'home,clean': '1558317374-067fb5f30001',
  'cool,air': '1558618666-fcd25c85cd64',
  'microwave,kitchen': '1556909114-f6e7ad7d3136',
  'barcode,shopping': '1556740758-90de374c12ad',
  'usb,technology': '1518770660439-4636190af475',
  'cd,computer': '1493225457124-a3eb161ffa5f',
  'music,cd': '1493225457124-a3eb161ffa5f',
  'music,phonograph': '1493225457124-a3eb161ffa5f',
  'music,elvis': '1493225457124-a3eb161ffa5f',
  'beatles,music': '1493225457124-a3eb161ffa5f',
  'jazz,music': '1511192336575-5a79af67a629',
  'disney,animation': '1520095972714-909e91b038e5',
  'scouts,youth': '1504280390367-361c6d9f38f4',
  'scouts,girls': '1504280390367-361c6d9f38f4',
  'wish,children': '1488521099670-57c491f27086',
  'olympics,special': '1461896836934-ffe607ba8211',
  'gymnastics,perfect': '1547347298-4074fc3086f0',
  'hockey,ice': '1515703407324-5f753afd8be8',
  'golf,masters': '1535131749-8e54a04e3086',
  'boxing,champion': '1549719386-74dfcbf7dbed',
  'bus,rights': '1544620347-c4fd4a3d5957',
  'pride,rights': '1562887042-1c04bb87f4d1',
  'accessibility,rights': '1573496359142-b8d87734a5a2',
  'marriage,love': '1519741497674-611481863552',
  'love,equality': '1519741497674-611481863552',
  'love,ireland': '1519741497674-611481863552',
  'peace,mlk': '1591848478625-de43268e6fb8',
  'peace,obama': '1569974507005-6dc61f97fb5c',
  'peace,education': '1503676260728-1c00da094a0b',
  'peace,law': '1569974507005-6dc61f97fb5c',
  'peace,korea': '1569974507005-6dc61f97fb5c',
  'peace,ireland': '1569974507005-6dc61f97fb5c',
  'peace,colombia': '1569974507005-6dc61f97fb5c',
  'nuclear,peace': '1569974507005-6dc61f97fb5c',
  'nobel,award': '1569974507005-6dc61f97fb5c',
  'obama,president': '1569974507005-6dc61f97fb5c',
  'pope,faith': '1548438294-852de9530dc5',
  'reading,braille': '1481627834876-b7833e8f5570',
  'university,education': '1503676260728-1c00da094a0b',
  'mouse,computer': '1527443224154-c4a3942d3acf',
};

function getImageUrl(keywords: string): string {
  const id = imageMap[keywords] || '1419242902214-272b3f66ee7a';
  return `https://images.unsplash.com/photo-${id}?w=1200&q=80`;
}

function getRandomMoment(): HistoricalMoment & { imageUrl: string } {
  const index = Math.floor(Math.random() * historicalMoments.length);
  const moment = historicalMoments[index];
  return {
    ...moment,
    imageUrl: getImageUrl(moment.keywords),
  };
}

export function MomentsScreen() {
  const [moment, setMoment] = useState(() => getRandomMoment());
  const [imageLoaded, setImageLoaded] = useState(false);

  // Get a new random moment each time the component mounts
  useEffect(() => {
    setMoment(getRandomMoment());
    setImageLoaded(false);
  }, []);

  return (
    <div
      style={{
        position: 'relative',
        height: '100%',
        width: '100%',
        overflow: 'hidden',
        background: '#0a0a0a',
      }}
    >
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes yearPulse {
          0%, 100% { opacity: 0.15; }
          50% { opacity: 0.25; }
        }
        @keyframes lineExpand {
          from { width: 0; }
          to { width: 120px; }
        }
      `}</style>

      {/* Full-screen background image */}
      <img
        src={moment.imageUrl}
        alt={moment.title}
        onLoad={() => setImageLoaded(true)}
        onError={() => setImageLoaded(true)}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          filter: 'grayscale(100%) contrast(1.1) brightness(0.9)',
          opacity: imageLoaded ? 0.7 : 0,
          transition: 'opacity 1.2s ease',
        }}
      />

      {/* Artistic overlay - multiple gradients for depth */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `
            radial-gradient(ellipse at 30% 20%, rgba(0,0,0,0) 0%, rgba(0,0,0,0.4) 70%),
            linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.6) 40%, rgba(0,0,0,0.2) 70%, transparent 100%)
          `,
          pointerEvents: 'none',
        }}
      />

      {/* Giant Year - fades into mist and stays gone, positioned higher */}
      <MistFadeText
        text={moment.year}
        appearDuration={2500}
        visibleDuration={8000}
        fadeDuration={4000}
        initialX={50}
        initialY={35}
        style={{
          fontSize: 300,
          fontWeight: 100,
          fontFamily: '"Playfair Display", Georgia, serif',
          color: 'rgba(255,255,255,0.25)',
          letterSpacing: '-0.05em',
          lineHeight: 1,
          textShadow: '0 0 120px rgba(255,255,255,0.2)',
          pointerEvents: 'none',
          userSelect: 'none',
          zIndex: 1,
        }}
      />

      {/* Title - fades into mist and stays gone */}
      <MistFadeText
        text={moment.title}
        appearDuration={3000}
        visibleDuration={9000}
        fadeDuration={3500}
        initialX={50}
        initialY={52}
        style={{
          fontSize: 42,
          fontWeight: 300,
          fontFamily: '"Playfair Display", Georgia, serif',
          color: 'rgba(255,255,255,0.85)',
          letterSpacing: '0.02em',
          lineHeight: 1.3,
          textShadow: '0 0 50px rgba(0,0,0,0.6)',
          pointerEvents: 'none',
          userSelect: 'none',
          maxWidth: '65%',
          textAlign: 'center',
          zIndex: 2,
        }}
      />

      {/* Content - centered artistic layout */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          padding: '60px 50px 70px',
        }}
      >
        {/* Section label */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            marginBottom: 24,
            animation: 'fadeInUp 1s ease 0.2s both',
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.4em',
              color: 'rgba(255,255,255,0.5)',
              textTransform: 'uppercase',
            }}
          >
            This Day in History
          </span>
          <div
            style={{
              height: 1,
              width: 100,
              background: 'linear-gradient(to right, rgba(255,255,255,0.4), transparent)',
            }}
          />
        </div>

        {/* Description - larger and more prominent */}
        <p
          style={{
            fontSize: 26,
            fontWeight: 300,
            lineHeight: 1.7,
            color: 'rgba(255,255,255,0.95)',
            margin: 0,
            maxWidth: 700,
            fontFamily: 'Georgia, serif',
            textShadow: '0 2px 30px rgba(0,0,0,0.5)',
            animation: 'fadeInUp 1s ease 0.4s both',
          }}
        >
          {moment.description}
        </p>
      </div>

      {/* Loading indicator */}
      {!imageLoaded && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: '#444',
            fontSize: 10,
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
          }}
        >
          Loading...
        </div>
      )}
    </div>
  );
}
