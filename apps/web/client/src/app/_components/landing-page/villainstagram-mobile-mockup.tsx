import React from 'react';
import { Icons } from '@onlook/ui/icons';

export function VillainstagramMobileMockup() {
  return (
    <div className="bg-black w-64 h-140 rounded-xs border border-neutral-800 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-700">
          <span className="text-white font-semibold text-base">Instagram</span>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-white rounded-sm"></div>
            <div className="w-4 h-4 bg-white rounded-sm relative">
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></div>
            </div>
          </div>
        </div>
        
        {/* Stories */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-neutral-700 overflow-x-auto">
          {[
            { name: 'shadow', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face' },
            { name: 'chaos', image: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face' },
            { name: 'dark', image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face' },
            { name: 'nefarious', image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face' },
            { name: 'evil', image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face' },
            { name: 'zucc', image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop&crop=face' }
          ].map((story, i) => (
            <div key={i} className="flex flex-col items-center gap-1 min-w-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-red-500 p-0.5">
                <div className="w-full h-full rounded-full bg-white p-0.5">
                  <div className="w-full h-full rounded-full bg-cover bg-center" style={{ backgroundImage: `url(${story.image})` }}></div>
                </div>
              </div>
              <span className="text-[10px] text-gray-300 truncate">{story.name}</span>
            </div>
          ))}
        </div>
        
        {/* Posts */}
        <div className="flex-1 overflow-y-auto">
          {/* Post 1 */}
          <div className="border-b border-neutral-700 py-2">
            <div className="flex items-center justify-between px-0 py-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-gradient-to-br from-green-600 to-blue-600 rounded-full p-0.5">
                  <div className="w-full h-full rounded-full bg-cover bg-center" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face)' }}></div>
                </div>
                <span className="text-white font-medium text-xs">shadow_master</span>
                <span className="text-gray-400 text-[10px]">1d</span>
              </div>
              <div className="w-3.5 h-3.5 bg-white rounded-sm"></div>
            </div>
            <div className="w-full aspect-square bg-gray-800 bg-cover bg-center" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=400&fit=crop)' }}>
            </div>
            <div className="py-2">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-4 h-4 bg-white rounded-sm"></div>
                <div className="w-4 h-4 bg-white rounded-sm"></div>
                <div className="w-4 h-4 bg-white rounded-sm"></div>
                <div className="w-4 h-4 bg-white rounded-sm ml-auto"></div>
              </div>
              <div className="text-white text-xs">
                <span className="font-medium">shadow_master</span> Another successful heist completed! 💎 #VillainLife
              </div>
            </div>
          </div>
          
          {/* Post 2 */}
          <div className="border-b border-neutral-700 py-2">
            <div className="flex items-center justify-between px-0 py-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-gradient-to-br from-red-600 to-orange-600 rounded-full p-0.5">
                  <div className="w-full h-full rounded-full bg-cover bg-center" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face)' }}></div>
                </div>
                <span className="text-white font-medium text-xs">chaos_queen</span>
                <span className="text-gray-400 text-[10px]">2h</span>
              </div>
              <div className="w-3.5 h-3.5 bg-white rounded-sm"></div>
            </div>
            <div className="w-full aspect-square bg-gray-800 bg-cover bg-center" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=400&fit=crop)' }}>
            </div>
            <div className="py-2">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-4 h-4 bg-white rounded-sm"></div>
                <div className="w-4 h-4 bg-white rounded-sm"></div>
                <div className="w-4 h-4 bg-white rounded-sm"></div>
                <div className="w-4 h-4 bg-white rounded-sm ml-auto"></div>
              </div>
              <div className="text-white text-xs">
                <span className="font-medium">chaos_queen</span> Perfecting the art of villainy ✨ #DarkMode #Villainstagram
              </div>
            </div>
          </div>
        </div>
        
        {/* Bottom Navigation */}
        <div className="flex items-center justify-around py-1.5 border-t border-neutral-700">
          <div className="w-3 h-3 bg-white rounded-sm"></div>
          <div className="w-3 h-3 bg-gray-400 rounded-sm"></div>
          <div className="w-3 h-3 bg-gray-400 rounded-sm"></div>
          <div className="w-3 h-3 bg-gray-400 rounded-sm"></div>
          <div className="w-3 h-3 bg-gradient-to-br from-purple-600 to-red-600 rounded-full"></div>
        </div>
      </div>
  );
}
