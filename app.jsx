// === CONTRACT MARKERS (auto-injected for traceability) ===
// CONTRACT: primary-action-button
// === END CONTRACT MARKERS ===

const { useState, useEffect, useCallback, useRef } = React;

// ─── Reusable UI Components ───────────────────────────────────────────────────

const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-gray-200 ${className}`}>
    {children}
  </div>
);

const Button = ({ children, onClick, variant = "primary", className = "", disabled = false, type = "button" }) => {
  const base = "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800",
    secondary: "bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300",
    danger: "bg-red-500 text-white hover:bg-red-600",
    ghost: "text-gray-600 hover:bg-gray-100",
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
};

const Badge = ({ children, color = "green", className = "" }) => {
  const colors = {
    green: "bg-green-100 text-green-800",
    blue: "bg-blue-100 text-blue-800",
    red: "bg-red-100 text-red-800",
    yellow: "bg-yellow-100 text-yellow-800",
    gray: "bg-gray-100 text-gray-700",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[color]} ${className}`}>
      {children}
    </span>
  );
};

const Input = ({ label, value, onChange, placeholder, type = "text", className = "", required = false }) => (
  <div className={`flex flex-col gap-1 ${className}`}>
    {label && <label className="text-sm font-medium text-gray-700">{label}{required && <span className="text-red-500 ml-1">*</span>}</label>}
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
    />
  </div>
);

// ─── Sample Data ──────────────────────────────────────────────────────────────
const SAMPLE_PHOTOS = [
  { id: 1, title: "Golden Hour", description: "Sunset over the mountains", author: "Alice Chen", likes: 142, comments: 18, tags: ["nature", "sunset"], url: "https://picsum.photos/seed/photo1/800/600", createdAt: "2024-01-15T10:30:00Z", liked: false },
  { id: 2, title: "City Lights", description: "Downtown at night", author: "Bob Martinez", likes: 89, comments: 7, tags: ["urban", "night"], url: "https://picsum.photos/seed/photo2/800/600", createdAt: "2024-01-14T20:00:00Z", liked: true },
  { id: 3, title: "Ocean Breeze", description: "Waves crashing on the shore", author: "Carol White", likes: 203, comments: 31, tags: ["ocean", "travel"], url: "https://picsum.photos/seed/photo3/800/600", createdAt: "2024-01-13T08:15:00Z", liked: false },
  { id: 4, title: "Forest Path", description: "A quiet walk through the woods", author: "David Kim", likes: 67, comments: 5, tags: ["nature", "forest"], url: "https://picsum.photos/seed/photo4/800/600", createdAt: "2024-01-12T14:45:00Z", liked: false },
  { id: 5, title: "Mountain Peak", description: "Summit view at dawn", author: "Eva Lopez", likes: 315, comments: 42, tags: ["mountains", "adventure"], url: "https://picsum.photos/seed/photo5/800/600", createdAt: "2024-01-11T06:00:00Z", liked: true },
  { id: 6, title: "Desert Dunes", description: "Sand patterns in the Sahara", author: "Frank Nguyen", likes: 178, comments: 22, tags: ["desert", "travel"], url: "https://picsum.photos/seed/photo6/800/600", createdAt: "2024-01-10T12:00:00Z", liked: false },
];

// ─── Main View ────────────────────────────────────────────────────────────────
const MainView = () => {
  const [photos, setPhotos] = useState(SAMPLE_PHOTOS);
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState(null);

  const allTags = [...new Set(photos.flatMap(p => p.tags))];

  const filtered = photos.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.author.toLowerCase().includes(search.toLowerCase());
    const matchesTag = !activeTag || p.tags.includes(activeTag);
    return matchesSearch && matchesTag;
  });

  const toggleLike = (id) => {
    setPhotos(prev => prev.map(p =>
      p.id === id ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 } : p
    ));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">📸 Photo Gallery</h1>
          <Badge color="blue">{photos.length} photos</Badge>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-6 flex flex-col sm:flex-row gap-3">
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search photos or authors..."
            className="flex-1"
          />
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={activeTag === null ? "primary" : "secondary"}
              onClick={() => setActiveTag(null)}
            >All</Button>
            {allTags.map(tag => (
              <Button
                key={tag}
                variant={activeTag === tag ? "primary" : "secondary"}
                onClick={() => setActiveTag(tag === activeTag ? null : tag)}
              >{tag}</Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(photo => (
            <Card key={photo.id} className="overflow-hidden">
              <img
                src={photo.url}
                alt={photo.title}
                className="w-full h-48 object-cover"
                onError={e => { e.target.style.background = '#e5e7eb'; e.target.style.height = '12rem'; }}
              />
              <div className="p-4">
                <div className="flex items-start justify-between mb-1">
                  <h3 className="font-semibold text-gray-900">{photo.title}</h3>
                </div>
                <p className="text-sm text-gray-500 mb-2">{photo.description}</p>
                <p className="text-xs text-gray-400 mb-3">by {photo.author}</p>
                <div className="flex gap-1 mb-3 flex-wrap">
                  {photo.tags.map(tag => (
                    <Badge key={tag} color="blue">{tag}</Badge>
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleLike(photo.id)}
                    className={`flex items-center gap-1 text-sm transition-colors ${
                      photo.liked ? 'text-red-500' : 'text-gray-400 hover:text-red-400'
                    }`}
                  >
                    <span>{photo.liked ? '❤️' : '🤍'}</span>
                    <span>{photo.likes}</span>
                  </button>
                  <span className="flex items-center gap-1 text-sm text-gray-400">
                    <span>💬</span>
                    <span>{photo.comments}</span>
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">🔍</p>
            <p className="text-lg font-medium">No photos found</p>
            <p className="text-sm">Try a different search or tag filter</p>
          </div>
        )}
      </main>
    </div>
  );
};

// ─── App Root ─────────────────────────────────────────────────────────────────
const App = () => <MainView />;

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
