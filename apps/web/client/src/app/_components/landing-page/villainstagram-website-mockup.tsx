import React from 'react';
import { Icons } from '@onlook/ui/icons';

// Villainstagram Mockup Component
export function VillainstagramWebsiteMockup() {
  return (
    <div className="bg-white w-140 h-140 rounded-xs flex flex-row overflow-hidden">
        {/* Left Sidebar - Navigation */}
        <div className="w-28 bg-white border-r border-foreground-secondary/20 flex flex-col py-3 px-2">
          {/* Logo */}
          <div className="mb-6 flex justify-center">
            <span className="text-black font-semibold text-xs">Villainstagram</span>
          </div>
          
          {/* Navigation Icons */}
          <div className="flex flex-col gap-4 w-42">
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 bg-black rounded-sm"></div>
              <span className="text-[10px] text-black">Home</span>
            </div>
            <div className="flex items-center gap-2">
              <Icons.MagnifyingGlass className="w-3.5 h-3.5 text-black" />
              <span className="text-[10px] text-black">Search</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 bg-black rounded-sm"></div>
              <span className="text-[10px] text-black">Explore</span>
            </div>
            <div className="flex items-center gap-2">
              <Icons.Play className="w-3.5 h-3.5 text-black" />
              <span className="text-[10px] text-black">Reels</span>
            </div>
            <div className="flex items-center gap-2 relative">
              <Icons.ChatBubble className="w-3 h-3 ml-0.5 text-black" />
              <span className="text-[10px] text-black">Messages</span>
            </div>
            <div className="flex items-center gap-2">
              <Icons.Plus className="w-3.5 h-3.5 text-black" />
              <span className="text-[10px] text-black">Create</span>
            </div>
            <div className="flex items-center gap-2">
              <Icons.Person className="w-3.5 h-3.5 text-black" />
              <span className="text-[10px] text-black">Profile</span>
            </div>
          </div>
        </div>
        
        {/* Center - Main Feed */}
        <div className="w-64 flex flex-col ml-12 mr-12 mt-2">
          {/* Stories */}
          <div className="flex items-center gap-6 px-2 py-2 border-b border-gray-200 overflow-x-auto">
            {[
              { name: 'shadow', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face' },
              { name: 'chaos', image: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face' },
              { name: 'dark', image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face' },
              { name: 'nefarious', image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face' },
              { name: 'evil', image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face' },
              { name: 'zucc', image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop&crop=face' }
            ].map((story, i) => (
              <div key={i} className="flex flex-col items-center gap-0.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-red-500 p-0.5">
                  <div className="w-full h-full rounded-full bg-white p-0.5">
                    <div className="w-full h-full rounded-full bg-cover bg-center" style={{ backgroundImage: `url(${story.image})` }}></div>
                  </div>
                </div>
                <span className="text-[10px] text-gray-600 truncate">{story.name}</span>
              </div>
            ))}
          </div>
          
          {/* Posts */}
          <div className="flex-1 overflow-y-auto">
            {/* Post 1 */}
            <div className="border-b border-gray-200 py-2">
              <div className="flex items-center justify-between px-0 py-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-gradient-to-br from-green-600 to-blue-600 rounded-full p-0.5">
                    <div className="w-full h-full rounded-full bg-cover bg-center" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face)' }}></div>
                  </div>
                  <span className="text-black font-medium text-xs">shadow_master</span>
                  <span className="text-gray-500 text-[10px]">1d</span>
                </div>
                <Icons.DotsHorizontal className="w-3.5 h-3.5 text-black" />
              </div>
              <div className="w-full aspect-square bg-gray-200 bg-cover bg-center" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=400&fit=crop)' }}>
              </div>
              <div className="py-2">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-4 h-4 bg-black rounded-sm"></div>
                  <div className="w-4 h-4 bg-black rounded-sm"></div>
                  <div className="w-4 h-4 bg-black rounded-sm"></div>
                  <div className="w-4 h-4 bg-black rounded-sm ml-auto"></div>
                </div>
                <div className="text-black text-xs">
                  <span className="font-medium">shadow_master</span> Another successful heist completed! 💎 #VillainLife
                </div>
              </div>
            </div>
            
            {/* Post 2 */}
            <div className="border-b border-gray-200 py-2">
              <div className="flex items-center justify-between px-0 py-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-gradient-to-br from-red-600 to-orange-600 rounded-full p-0.5">
                    <div className="w-full h-full rounded-full bg-cover bg-center" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face)' }}></div>
                  </div>
                  <span className="text-black font-medium text-xs">chaos_queen</span>
                  <span className="text-gray-500 text-[10px]">2h</span>
                </div>
                <Icons.DotsHorizontal className="w-3.5 h-3.5 text-black" />
              </div>
              <div className="w-full aspect-square bg-gray-200 bg-cover bg-center" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop)' }}>
              </div>
              <div className="py-2">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-4 h-4 bg-black rounded-sm"></div>
                  <div className="w-4 h-4 bg-black rounded-sm"></div>
                  <div className="w-4 h-4 bg-black rounded-sm"></div>
                  <div className="w-4 h-4 bg-black rounded-sm ml-auto"></div>
                </div>
                <div className="text-black text-xs">
                  <span className="font-medium">chaos_queen</span> Perfecting the art of villainy ✨ #DarkMode #Villainstagram
                </div>
              </div>
            </div>
          </div>
        </div>
    </div>
  );
}
