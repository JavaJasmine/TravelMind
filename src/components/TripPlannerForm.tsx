import { useState } from "react";
import { TripProfile, INTERESTS, Interest } from "../types";

interface Props {
  profile: TripProfile;
  onChange: (p: TripProfile) => void;
  onSubmit: (p: TripProfile) => void;
  onClose: () => void;
  dark: boolean;
}

export default function TripPlannerForm({ profile, onChange, onSubmit, onClose, dark }: Props) {
  const [p, setP] = useState<TripProfile>(profile);

  const set = (key: keyof TripProfile, val: string) => {
    const next = { ...p, [key]: val };
    setP(next);
    onChange(next);
  };

  const toggleInterest = (tag: Interest) => {
    const cur = p.interests ?? [];
    const next = cur.includes(tag) ? cur.filter(t => t !== tag) : [...cur, tag];
    const up = { ...p, interests: next };
    setP(up);
    onChange(up);
  };

  const submit = () => {
    if (!p.destination?.trim()) return alert("Please enter a destination.");
    onSubmit(p);
  };

  const inp = `w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-400 transition ${
    dark ? "bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400" : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
  }`;

  const label = `block text-xs font-semibold mb-1 ${dark ? "text-gray-400" : "text-gray-600"}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl ${dark ? "bg-gray-900 text-gray-100" : "bg-white text-gray-900"}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-inherit rounded-t-2xl">
          <div>
            <h2 className="font-bold text-lg">🗺️ Plan Your Trip</h2>
            <p className={`text-xs ${dark ? "text-gray-400" : "text-gray-500"}`}>Fill in details for a personalized itinerary</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold">✕</button>
        </div>

        <div className="p-6 space-y-5">
          {/* Required */}
          <div>
            <p className={`text-xs font-bold uppercase tracking-wider mb-3 ${dark ? "text-emerald-400" : "text-emerald-600"}`}>Required</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className={label}>📍 Destination *</label>
                <input className={inp} placeholder="e.g. Tokyo, Japan" value={p.destination ?? ""} onChange={e => set("destination", e.target.value)} />
              </div>
              <div>
                <label className={label}>📅 Duration</label>
                <input className={inp} placeholder="e.g. 7 days" value={p.duration ?? ""} onChange={e => set("duration", e.target.value)} />
              </div>
              <div>
                <label className={label}>📅 Travel Dates</label>
                <input className={inp} placeholder="e.g. March 15–22, 2025" value={p.dates ?? ""} onChange={e => set("dates", e.target.value)} />
              </div>
              <div>
                <label className={label}>💰 Budget</label>
                <input className={inp} placeholder="e.g. 3000" value={p.budget ?? ""} onChange={e => set("budget", e.target.value)} />
              </div>
              <div>
                <label className={label}>💱 Currency</label>
                <input className={inp} placeholder="e.g. USD, EUR, GBP" value={p.currency ?? ""} onChange={e => set("currency", e.target.value)} />
              </div>
              <div>
                <label className={label}>👥 Number of Travelers</label>
                <input className={inp} placeholder="e.g. 2 adults" value={p.travelers ?? ""} onChange={e => set("travelers", e.target.value)} />
              </div>
              <div>
                <label className={label}>👫 Traveler Type</label>
                <select className={inp} value={p.travelerType ?? ""} onChange={e => set("travelerType", e.target.value)}>
                  <option value="">Select type...</option>
                  <option>Solo</option>
                  <option>Couple</option>
                  <option>Family with kids</option>
                  <option>Group of friends</option>
                  <option>Business</option>
                </select>
              </div>
            </div>
          </div>

          {/* Interests */}
          <div>
            <label className={`${label} mb-2`}>🎯 Interests & Priorities</label>
            <div className="flex flex-wrap gap-2">
              {INTERESTS.map((tag: Interest) => {
                const active = p.interests?.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleInterest(tag)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      active
                        ? "bg-emerald-500 border-emerald-500 text-white"
                        : dark
                          ? "bg-gray-700 border-gray-600 text-gray-300 hover:border-emerald-500"
                          : "bg-white border-gray-300 text-gray-600 hover:border-emerald-400"
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Optional */}
          <div>
            <p className={`text-xs font-bold uppercase tracking-wider mb-3 ${dark ? "text-gray-500" : "text-gray-400"}`}>Optional (improves personalization)</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={label}>🏨 Accommodation</label>
                <select className={inp} value={p.accommodation ?? ""} onChange={e => set("accommodation", e.target.value)}>
                  <option value="">Select preference...</option>
                  <option>Hostel / Budget</option>
                  <option>Mid-range hotel</option>
                  <option>Luxury hotel</option>
                  <option>Airbnb / Apartment</option>
                  <option>Boutique hotel</option>
                  <option>Resort</option>
                </select>
              </div>
              <div>
                <label className={label}>🏃 Pace</label>
                <select className={inp} value={p.pace ?? ""} onChange={e => set("pace", e.target.value)}>
                  <option value="">Select pace...</option>
                  <option>Relaxed (2-3 activities/day)</option>
                  <option>Moderate (3-4 activities/day)</option>
                  <option>Packed (5+ activities/day)</option>
                </select>
              </div>
              <div>
                <label className={label}>🚗 Transport Preference</label>
                <select className={inp} value={p.transport ?? ""} onChange={e => set("transport", e.target.value)}>
                  <option value="">Select transport...</option>
                  <option>Public transit</option>
                  <option>Rental car</option>
                  <option>Walking-focused</option>
                  <option>Taxis / Rideshare</option>
                  <option>Mix of everything</option>
                </select>
              </div>
              <div>
                <label className={label}>🍽️ Dietary Restrictions</label>
                <input className={inp} placeholder="e.g. Vegetarian, Halal, Gluten-free" value={p.dietary ?? ""} onChange={e => set("dietary", e.target.value)} />
              </div>
              <div>
                <label className={label}>✈️ Departing From</label>
                <input className={inp} placeholder="e.g. London, New York" value={p.departure ?? ""} onChange={e => set("departure", e.target.value)} />
              </div>
              <div>
                <label className={label}>🛂 Passport / Nationality</label>
                <input className={inp} placeholder="e.g. British, American" value={p.passport ?? ""} onChange={e => set("passport", e.target.value)} />
              </div>
              <div>
                <label className={label}>🌐 Languages Spoken</label>
                <input className={inp} placeholder="e.g. English, Spanish" value={p.language ?? ""} onChange={e => set("language", e.target.value)} />
              </div>
              <div>
                <label className={label}>♿ Accessibility Needs</label>
                <input className={inp} placeholder="e.g. Wheelchair accessible" value={p.accessibility ?? ""} onChange={e => set("accessibility", e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`flex gap-3 px-6 py-4 border-t sticky bottom-0 bg-inherit rounded-b-2xl ${dark ? "border-gray-700" : "border-gray-200"}`}>
          <button
            onClick={onClose}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${dark ? "border-gray-600 text-gray-300 hover:bg-gray-800" : "border-gray-300 text-gray-600 hover:bg-gray-50"}`}
          >
            Cancel
          </button>
          <button
            onClick={submit}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-emerald-500 hover:bg-emerald-600 text-white transition-colors shadow"
          >
            🚀 Generate My Itinerary
          </button>
        </div>
      </div>
    </div>
  );
}
