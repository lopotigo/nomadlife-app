import { Home, Compass, MessageCircle, Building2, User, Heart, MessageSquare, MapPin, Plus, Send, Search, Bell } from "lucide-react";

export default function MobilePreview() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-8">
      <div className="flex gap-8 flex-wrap justify-center">
        {/* Phone Frame 1 - Home/Feed */}
        <div className="w-[375px] h-[812px] bg-slate-900 rounded-[3rem] border-[8px] border-slate-800 overflow-hidden shadow-2xl relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-800 rounded-b-2xl" />
          
          <div className="h-full flex flex-col">
            {/* Status Bar */}
            <div className="h-12 bg-slate-900 flex items-center justify-between px-6 pt-2">
              <span className="text-white text-sm font-medium">9:41</span>
              <div className="flex gap-1">
                <div className="w-4 h-2 bg-white rounded-sm" />
                <div className="w-4 h-2 bg-white rounded-sm" />
                <div className="w-6 h-3 bg-green-500 rounded-sm" />
              </div>
            </div>

            {/* Header */}
            <div className="px-4 py-3 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">N</span>
                </div>
                <span className="text-white font-bold text-lg">NomadLife</span>
              </div>
              <div className="flex gap-2">
                <button className="w-9 h-9 bg-slate-800 rounded-full flex items-center justify-center">
                  <Bell className="w-4 h-4 text-slate-400" />
                </button>
                <button className="w-9 h-9 bg-slate-800 rounded-full flex items-center justify-center">
                  <Search className="w-4 h-4 text-slate-400" />
                </button>
              </div>
            </div>

            {/* Feed Content */}
            <div className="flex-1 overflow-hidden">
              {/* Post 1 */}
              <div className="p-4 border-b border-slate-800">
                <div className="flex items-center gap-3 mb-3">
                  <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=marco" className="w-10 h-10 rounded-full" />
                  <div>
                    <p className="text-white font-semibold text-sm">Marco Rossi</p>
                    <p className="text-slate-500 text-xs flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> Bali, Indonesia
                    </p>
                  </div>
                </div>
                <p className="text-white text-sm mb-3">Just arrived in Bali! The coworking scene here is incredible. Found an amazing spot with ocean views</p>
                <img src="https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=400&h=250&fit=crop" className="w-full h-40 object-cover rounded-xl mb-3" />
                <div className="flex items-center gap-4">
                  <button className="flex items-center gap-1.5 text-slate-400">
                    <Heart className="w-5 h-5" />
                    <span className="text-xs">24</span>
                  </button>
                  <button className="flex items-center gap-1.5 text-slate-400">
                    <MessageSquare className="w-5 h-5" />
                    <span className="text-xs">8</span>
                  </button>
                  <button className="flex items-center gap-1.5 text-slate-400">
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Post 2 */}
              <div className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=sarah" className="w-10 h-10 rounded-full" />
                  <div>
                    <p className="text-white font-semibold text-sm">Sarah Chen</p>
                    <p className="text-slate-500 text-xs flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> Lisbon, Portugal
                    </p>
                  </div>
                </div>
                <p className="text-white text-sm">Working from this stunning cafe in Lisbon. The perfect balance of work and exploration!</p>
              </div>
            </div>

            {/* FAB Button */}
            <button className="absolute bottom-24 right-4 w-14 h-14 bg-gradient-to-r from-teal-400 to-cyan-500 rounded-full flex items-center justify-center shadow-lg shadow-teal-500/30">
              <Plus className="w-6 h-6 text-white" />
            </button>

            {/* Bottom Navigation */}
            <div className="h-20 bg-slate-900 border-t border-slate-800 flex items-center justify-around px-2 pb-4">
              <button className="flex flex-col items-center gap-1">
                <Home className="w-6 h-6 text-teal-400" />
                <span className="text-[10px] text-teal-400 font-medium">Feed</span>
              </button>
              <button className="flex flex-col items-center gap-1">
                <Compass className="w-6 h-6 text-slate-500" />
                <span className="text-[10px] text-slate-500">Explore</span>
              </button>
              <button className="flex flex-col items-center gap-1">
                <MessageCircle className="w-6 h-6 text-slate-500" />
                <span className="text-[10px] text-slate-500">Chat</span>
              </button>
              <button className="flex flex-col items-center gap-1">
                <Building2 className="w-6 h-6 text-slate-500" />
                <span className="text-[10px] text-slate-500">Spaces</span>
              </button>
              <button className="flex flex-col items-center gap-1">
                <User className="w-6 h-6 text-slate-500" />
                <span className="text-[10px] text-slate-500">Profile</span>
              </button>
            </div>
          </div>
        </div>

        {/* Phone Frame 2 - Chat */}
        <div className="w-[375px] h-[812px] bg-slate-900 rounded-[3rem] border-[8px] border-slate-800 overflow-hidden shadow-2xl relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-800 rounded-b-2xl" />
          
          <div className="h-full flex flex-col">
            {/* Status Bar */}
            <div className="h-12 bg-slate-900 flex items-center justify-between px-6 pt-2">
              <span className="text-white text-sm font-medium">9:41</span>
              <div className="flex gap-1">
                <div className="w-4 h-2 bg-white rounded-sm" />
                <div className="w-4 h-2 bg-white rounded-sm" />
                <div className="w-6 h-3 bg-green-500 rounded-sm" />
              </div>
            </div>

            {/* Chat Header */}
            <div className="px-4 py-3 flex items-center gap-3 border-b border-slate-800">
              <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=sarah" className="w-10 h-10 rounded-full" />
              <div className="flex-1">
                <p className="text-white font-semibold">Sarah Chen</p>
                <p className="text-xs text-green-400">Online</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 p-4 space-y-3 overflow-hidden">
              <div className="flex justify-start">
                <div className="bg-slate-800 rounded-2xl rounded-bl-sm px-4 py-2 max-w-[75%]">
                  <p className="text-white text-sm">Hey! How's Bali treating you?</p>
                  <p className="text-[10px] text-slate-500 mt-1">10:30 AM</p>
                </div>
              </div>
              
              <div className="flex justify-end">
                <div className="bg-violet-500 rounded-2xl rounded-br-sm px-4 py-2 max-w-[75%]">
                  <p className="text-white text-sm">It's amazing! Found this incredible coworking space with ocean views</p>
                  <p className="text-[10px] text-violet-200 mt-1">10:32 AM</p>
                </div>
              </div>

              <div className="flex justify-start">
                <div className="bg-slate-800 rounded-2xl rounded-bl-sm px-4 py-2 max-w-[75%]">
                  <p className="text-white text-sm">That sounds perfect! I'm still in Lisbon, thinking of heading to Portugal next month</p>
                  <p className="text-[10px] text-slate-500 mt-1">10:35 AM</p>
                </div>
              </div>

              <div className="flex justify-end">
                <div className="bg-violet-500 rounded-2xl rounded-br-sm px-4 py-2 max-w-[75%]">
                  <p className="text-white text-sm">You should totally come! The community here is super welcoming</p>
                  <p className="text-[10px] text-violet-200 mt-1">10:38 AM</p>
                </div>
              </div>

              <div className="flex justify-start">
                <div className="bg-slate-800 rounded-2xl rounded-bl-sm px-4 py-2 max-w-[75%]">
                  <p className="text-white text-sm">Maybe we can meet up! Let me check flights</p>
                  <p className="text-[10px] text-slate-500 mt-1">10:40 AM</p>
                </div>
              </div>
            </div>

            {/* Message Input */}
            <div className="p-4 bg-slate-900 border-t border-slate-800 flex gap-2 pb-8">
              <input
                type="text"
                placeholder="Type a message..."
                className="flex-1 bg-slate-800 border border-slate-700 rounded-full px-4 py-3 text-sm text-white placeholder:text-slate-500"
              />
              <button className="w-12 h-12 bg-violet-500 rounded-full flex items-center justify-center">
                <Send className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* Phone Frame 3 - Profile */}
        <div className="w-[375px] h-[812px] bg-slate-900 rounded-[3rem] border-[8px] border-slate-800 overflow-hidden shadow-2xl relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-800 rounded-b-2xl" />
          
          <div className="h-full flex flex-col">
            {/* Status Bar */}
            <div className="h-12 bg-slate-900 flex items-center justify-between px-6 pt-2">
              <span className="text-white text-sm font-medium">9:41</span>
              <div className="flex gap-1">
                <div className="w-4 h-2 bg-white rounded-sm" />
                <div className="w-4 h-2 bg-white rounded-sm" />
                <div className="w-6 h-3 bg-green-500 rounded-sm" />
              </div>
            </div>

            {/* Profile Header */}
            <div className="px-4 py-6 text-center border-b border-slate-800">
              <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=marco" className="w-24 h-24 rounded-full mx-auto border-4 border-teal-500" />
              <h2 className="text-white font-bold text-xl mt-4">Marco Rossi</h2>
              <p className="text-slate-400 text-sm">@marco</p>
              <p className="text-slate-500 text-sm flex items-center justify-center gap-1 mt-1">
                <MapPin className="w-4 h-4 text-teal-400" /> Bali, Indonesia
              </p>
              <p className="text-slate-400 text-sm mt-3 px-8">Digital nomad exploring Southeast Asia</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 p-4 border-b border-slate-800">
              <div className="text-center">
                <p className="text-2xl font-bold text-teal-400">23</p>
                <p className="text-xs text-slate-500">Countries</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-cyan-400">47</p>
                <p className="text-xs text-slate-500">Cities</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-violet-400">12</p>
                <p className="text-xs text-slate-500">Spaces</p>
              </div>
            </div>

            {/* Posts Grid */}
            <div className="flex-1 p-2">
              <p className="text-slate-400 text-xs font-medium px-2 mb-2">Recent Posts</p>
              <div className="grid grid-cols-3 gap-1">
                <img src="https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=150&h=150&fit=crop" className="w-full aspect-square object-cover rounded-lg" />
                <img src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=150&h=150&fit=crop" className="w-full aspect-square object-cover rounded-lg" />
                <img src="https://images.unsplash.com/photo-1598970434795-0c54fe7c0648?w=150&h=150&fit=crop" className="w-full aspect-square object-cover rounded-lg" />
                <img src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=150&h=150&fit=crop" className="w-full aspect-square object-cover rounded-lg" />
                <img src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=150&h=150&fit=crop" className="w-full aspect-square object-cover rounded-lg" />
                <img src="https://images.unsplash.com/photo-1519046904884-53103b34b206?w=150&h=150&fit=crop" className="w-full aspect-square object-cover rounded-lg" />
              </div>
            </div>

            {/* Bottom Navigation */}
            <div className="h-20 bg-slate-900 border-t border-slate-800 flex items-center justify-around px-2 pb-4">
              <button className="flex flex-col items-center gap-1">
                <Home className="w-6 h-6 text-slate-500" />
                <span className="text-[10px] text-slate-500">Feed</span>
              </button>
              <button className="flex flex-col items-center gap-1">
                <Compass className="w-6 h-6 text-slate-500" />
                <span className="text-[10px] text-slate-500">Explore</span>
              </button>
              <button className="flex flex-col items-center gap-1">
                <MessageCircle className="w-6 h-6 text-slate-500" />
                <span className="text-[10px] text-slate-500">Chat</span>
              </button>
              <button className="flex flex-col items-center gap-1">
                <Building2 className="w-6 h-6 text-slate-500" />
                <span className="text-[10px] text-slate-500">Spaces</span>
              </button>
              <button className="flex flex-col items-center gap-1">
                <User className="w-6 h-6 text-teal-400" />
                <span className="text-[10px] text-teal-400 font-medium">Profile</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
