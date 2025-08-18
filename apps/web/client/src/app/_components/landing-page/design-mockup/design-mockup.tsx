import React from 'react';
import { DesignMockupIcons } from './design-mockup-icons';
import { vujahdayScript } from '../../../fonts';

// Image Card Component
interface ImageCardProps {
  src: string;
  alt: string;
  caption: string;
  isSelected?: boolean;
  lightMode?: boolean;
}

function ImageCard({ src, alt, caption, isSelected = false, lightMode = false }: ImageCardProps) {
  return (
    <div className={`break-inside-avoid mb-2 ${isSelected ? 'border-1 border-purple-500' : ''}`}>
      <div className="relative w-full">
        <div className={`${lightMode ? 'bg-gray-200' : 'bg-gray-800'} rounded-xs mb-1 absolute inset-0`}></div>
        <img 
          src={src}
          alt={alt}
          className="w-full mb-1.5 object-cover relative z-10"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      </div>
      <p className={`text-[6px] ${lightMode ? 'text-gray-600' : 'text-gray-300'} leading-relaxed font-mono uppercase mb-3`}>{caption}</p>
    </div>
  );
}

export function DesignMockup() {
  return (
    <div className="bg-gray-800 w-140 h-140 rounded-sm flex flex-col overflow-hidden">
      {/* Top Navigation Bar */}
      <div className="h-10 bg-gray-900 border-b border-[0.5px] border-gray-600/50 flex items-center px-2 py-1.5 gap-2">
        {/* Logo */}
        <div className="w-5 h-5 bg-black rounded flex items-center justify-center">
          <span className={`text-white mr-1.5 text-xs ${vujahdayScript.className}`}>V</span>
        </div>
        
        {/* Search Bar */}
        <div className="flex-1 flex items-center bg-gray-600/20 rounded-sm px-2 py-1">
          <span className="text-[8px] text-gray-200/50 font-mono tracking-tight">Brutalist lair decor</span>
          <div className="ml-auto flex items-center gap-1">
            <DesignMockupIcons.CrossL className="w-2.5 h-2.5 text-gray-400" />
          </div>
        </div>
        
        {/* Right Buttons */}
        <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-black"></div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex h-full">
        {/* Left Sidebar */}
        <div className="w-11 flex flex-col items-center py-4 h-full justify-between">
          <div className="flex flex-col items-center gap-4">
            <DesignMockupIcons.Explore className="w-4 h-4 text-gray-500" />
            <DesignMockupIcons.Home className="w-4 h-4 text-gray-500" />
            <DesignMockupIcons.Messages className="w-4 h-4 text-gray-500" />
            <DesignMockupIcons.Notifications className="w-4 h-4 text-gray-500" />
          </div>
          <div className="items-center justify-end h-12">
            <DesignMockupIcons.Gear className="w-4 h-4 text-gray-500" />
          </div>
          
        </div>
        
        {/* Image Grid */}
        <div className="flex-1 pt-3 pr-4">
          <div className="columns-4 gap-4">
            {/* Image Cards */}
            <ImageCard
              src="/assets/the___daniel_httpss.mj.run4iXjsEavMyQ_minimalist_interior_wit_310f6c88-ea16-448f-af55-16f51782132a_1.jpg"
              alt="Minimalist Interior with Dramatic Lighting"
              caption="Minimalist Interior with Dramatic Lighting"
              isSelected={true}
            />
            <ImageCard
              src="/assets/the___daniel_httpss.mj.run8EdjwNCSTns_black_leather_bar_stool_013dbd70-a2cc-44f7-a314-bbe275b86563_3.jpg"
              alt="Black Leather Bar Stool"
              caption="Black Leather Bar Stool with Brass Accents"
            />
            <ImageCard
              src="/assets/the___daniel_httpss.mj.runzX8_66H3mvo_spikey_ceramic_iron_met_4e9c30d0-e0cd-4f56-87f7-f62c2f691c08_2.jpg"
              alt="Spikey Ceramic Iron Metal"
              caption="Spikey Ceramic Iron Metal Sculpture"
            />
            <ImageCard
              src="/assets/the___daniel_httpss.mj.runAp9BRoSUG-Q_silhouette_of_a_black_b_66ef6127-e9fd-4a70-8769-989d81178b23_1.jpg"
              alt="Black Bar Stool Silhouette"
              caption="Black Bar Stool Silhouette Design"
            />
            <ImageCard
              src="/assets/the___daniel_httpss.mj.runcW6Xiv8NRPs_close-up_of_two_ceramic_de5b83cb-7ee5-4430-af5b-f868d487ebe4_2.jpg"
              alt="Ceramic Brutalist Objects"
              caption="Ceramic Brutalist Objects with Spikes"
            />
            <ImageCard
              src="/assets/the___daniel_httpss.mj.runF-rvbzgq3F8_brutalist_dark_glass_va_748a3c8c-a6a5-4840-93e7-efbbffcce8f1_1.jpg"
              alt="Brutalist Dark Glass Vase"
              caption="Brutalist Dark Glass Vase Sculpture"
            />
            <ImageCard
              src="/assets/the___daniel_httpss.mj.runKt88JTu6rPQ_golden_muted_sharp_inte_324633e8-d399-4025-9a0f-a6010f1c4df2_0.jpg"
              alt="Golden Muted Interior"
              caption="Golden Muted Interior with Sharp Lines"
            />
            <ImageCard
              src="/assets/the___daniel_httpss.mj.runMVYWfDFX_XE_realistic_contemporary__fe607fdd-058e-47bf-ab6f-d22b732c2f66_2.jpg"
              alt="Contemporary Brutalist Interior"
              caption="Contemporary Brutalist Interior Design"
            />
            <ImageCard
              src="/assets/the___daniel_httpss.mj.runPguWEsbeT0k_two_minimalist_zig-zag__7f026ef1-b94a-4fce-a7c3-551f51cf0726_0.jpg"
              alt="Minimalist Zig-Zag Chairs"
              caption="Minimalist Zig-Zag Chair Design"
            />
            <ImageCard
              src="/assets/the___daniel_httpss.mj.runpYhbRvhCgnQ_minimalist_metalic_shee_8daa01a7-2b6e-4bb4-9e13-6c6ac6f05959_1.jpg"
              alt="Minimalist Metallic Sheer"
              caption="Minimalist Metallic Sheer Design"
            />
            <ImageCard
              src="/assets/the___daniel_httpss.mj.runSh8wz2Xb28A_lounge_chair_against_a__ddb9bc7d-889d-4ea1-9129-48646172c544_2.jpg"
              alt="Lounge Chair Against Wall"
              caption="Lounge Chair Against Clean Wall"
            />
            <ImageCard
              src="/assets/the___daniel_httpss.mj.run0PLeZ5UEQR0_Metallic_chair_with_a_b_df9ea8f5-80e6-494a-9275-e01030e157b9_2.jpg"
              alt="Metallic Chair with Brutalist Design"
              caption="Metallic Chair with Brutalist Design"
            />
            <ImageCard
              src="/assets/the___daniel_httpss.mj.runtlX3nAWDPCk_Living_room_with_metal__53bf67c2-354a-4072-bd46-abf7aa0e555e_0.jpg"
              alt="Living Room with Metal Furniture"
              caption="Living Room with Metal Furniture Design"
            />
            <ImageCard
              src="/assets/the___daniel_httpss.mj.runIdTptP6hhTA_a_metallic_brushed_meta_76b89c75-015d-4127-bef8-cbf67bf63e3d_2%20(1).jpg"
              alt="Metallic Brushed Metal Chair"
              caption="Metallic Brushed Metal Chair Design"
            />
            <ImageCard
              src="/assets/the___daniel_httpss.mj.run8EdjwNCSTns_black_leather_bar_stool_013dbd70-a2cc-44f7-a314-bbe275b86563_3.jpg"
              alt="Black Leather Furniture"
              caption="Black Leather Furniture Design"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function DesignMockupMobile() {
  return (
    <div className="bg-[#FFFFEE] w-50 h-116 rounded-sm flex flex-col overflow-hidden border border-gray-200">
      {/* Top Navigation Bar */}
      <div className="h-8 border-b border-[0.5px] border-gray-100/50 flex items-center px-2 py-1 gap-2">
        {/* Pinterest Logo */}
        <div className="w-5 h-5 bg-black rounded flex items-center justify-center">
          <span className={`text-white mr-1.5 text-xs ${vujahdayScript.className}`}>V</span>
        </div>
        
        {/* Search Bar */}
        <div className="flex-1 flex items-center bg-gray-100/50 rounded-sm px-2 py-1">
          <span className="text-[8px] text-gray-400 font-mono tracking-tight">Brutalist lair decor</span>
          <div className="ml-auto flex items-center gap-1">
            <DesignMockupIcons.CrossL className="w-2.5 h-2.5 text-gray-500" />
          </div>
        </div>
        
        {/* Right Buttons */}
        <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-gray-300"></div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex h-full">
        {/* Left Sidebar */}
        <div className="w-11 flex flex-col items-center py-3 h-full justify-between hidden">
          <div className="flex flex-col items-center gap-3">
            <DesignMockupIcons.Explore className="w-4 h-4 text-gray-600" />
            <DesignMockupIcons.Home className="w-4 h-4 text-gray-600" />
            <DesignMockupIcons.Messages className="w-4 h-4 text-gray-600" />
            <DesignMockupIcons.Notifications className="w-4 h-4 text-gray-600" />
          </div>
          <div className="items-center justify-end h-12">
            <DesignMockupIcons.Gear className="w-4 h-4 text-gray-600" />
          </div>
          
        </div>
        
        {/* Image Grid */}
        <div className="flex-1 pt-3 px-2 pb-2 h-full">
          <div className="columns-2 gap-2 h-full overflow-y-auto">
            {/* Image Cards */}
            <ImageCard
              src="/assets/the___daniel_httpss.mj.run4iXjsEavMyQ_minimalist_interior_wit_310f6c88-ea16-448f-af55-16f51782132a_1.jpg"
              alt="Minimalist Interior with Dramatic Lighting"
              caption="Minimalist Interior with Dramatic Lighting"
              isSelected={false}
              lightMode={true}
            />
            <ImageCard
              src="/assets/the___daniel_httpss.mj.run8EdjwNCSTns_black_leather_bar_stool_013dbd70-a2cc-44f7-a314-bbe275b86563_3.jpg"
              alt="Black Leather Bar Stool"
              caption="Black Leather Bar Stool with Brass Accents"
              lightMode={true}
            />
            <ImageCard
              src="/assets/the___daniel_httpss.mj.runAp9BRoSUG-Q_silhouette_of_a_black_b_66ef6127-e9fd-4a70-8769-989d81178b23_1.jpg"
              alt="Black Bar Stool Silhouette"
              caption="Black Bar Stool Silhouette Design"
              lightMode={true}
            />
            <ImageCard
              src="/assets/the___daniel_httpss.mj.runcW6Xiv8NRPs_close-up_of_two_ceramic_de5b83cb-7ee5-4430-af5b-f868d487ebe4_2.jpg"
              alt="Ceramic Brutalist Objects"
              caption="Ceramic Brutalist Objects with Spikes"
              lightMode={true}
            />
            <ImageCard
              src="/assets/the___daniel_httpss.mj.runF-rvbzgq3F8_brutalist_dark_glass_va_748a3c8c-a6a5-4840-93e7-efbbffcce8f1_1.jpg"
              alt="Brutalist Dark Glass Vase"
              caption="Brutalist Dark Glass Vase Sculpture"
              lightMode={true}
            />
            <ImageCard
              src="/assets/the___daniel_httpss.mj.runKt88JTu6rPQ_golden_muted_sharp_inte_324633e8-d399-4025-9a0f-a6010f1c4df2_0.jpg"
              alt="Golden Muted Interior"
              caption="Golden Muted Interior with Sharp Lines"
              lightMode={true}
            />
            <ImageCard
              src="/assets/the___daniel_httpss.mj.runMVYWfDFX_XE_realistic_contemporary__fe607fdd-058e-47bf-ab6f-d22b732c2f66_2.jpg"
              alt="Contemporary Brutalist Interior"
              caption="Contemporary Brutalist Interior Design"
              lightMode={true}
            />
            <ImageCard
              src="/assets/the___daniel_httpss.mj.runPguWEsbeT0k_two_minimalist_zig-zag__7f026ef1-b94a-4fce-a7c3-551f51cf0726_0.jpg"
              alt="Minimalist Zig-Zag Chairs"
              caption="Minimalist Zig-Zag Chair Design"
              lightMode={true}
            />
            <ImageCard
              src="/assets/the___daniel_httpss.mj.runpYhbRvhCgnQ_minimalist_metalic_shee_8daa01a7-2b6e-4bb4-9e13-6c6ac6f05959_1.jpg"
              alt="Minimalist Metallic Sheer"
              caption="Minimalist Metallic Sheer Design"
              lightMode={true}
            />
            <ImageCard
              src="/assets/the___daniel_httpss.mj.runSh8wz2Xb28A_lounge_chair_against_a__ddb9bc7d-889d-4ea1-9129-48646172c544_2.jpg"
              alt="Lounge Chair Against Wall"
              caption="Lounge Chair Against Clean Wall"
              lightMode={true}
            />
            <ImageCard
              src="/assets/the___daniel_httpss.mj.runzX8_66H3mvo_spikey_ceramic_iron_met_4e9c30d0-e0cd-4f56-87f7-f62c2f691c08_2.jpg"
              alt="Spikey Ceramic Iron Metal"
              caption="Spikey Ceramic Iron Metal Sculpture"
              lightMode={true}
            />
            <ImageCard
              src="/assets/the___daniel_httpss.mj.run0PLeZ5UEQR0_Metallic_chair_with_a_b_df9ea8f5-80e6-494a-9275-e01030e157b9_2.jpg"
              alt="Metallic Chair with Brutalist Design"
              caption="Metallic Chair with Brutalist Design"
              lightMode={true}
            />
            <ImageCard
              src="/assets/the___daniel_httpss.mj.runtlX3nAWDPCk_Living_room_with_metal__53bf67c2-354a-4072-bd46-abf7aa0e555e_0.jpg"
              alt="Living Room with Metal Furniture"
              caption="Living Room with Metal Furniture Design"
              lightMode={true}
            />
            <ImageCard
              src="/assets/the___daniel_httpss.mj.runIdTptP6hhTA_a_metallic_brushed_meta_76b89c75-015d-4127-bef8-cbf67bf63e3d_2%20(1).jpg"
              alt="Metallic Brushed Metal Chair"
              caption="Metallic Brushed Metal Chair Design"
              lightMode={true}
            />
          </div>
        </div>
      </div>
      
      {/* Mobile Tab Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-10 bg-white/20 backdrop-blur-2xl border-t border-[0.5px] border-white/50 flex items-center justify-around px-2 z-10">
        <div className="flex flex-col items-center gap-1">
          <DesignMockupIcons.Home className="w-4 h-4 text-gray-600/80" />
        </div>
        <div className="flex flex-col items-center gap-1">
          <DesignMockupIcons.Explore className="w-4 h-4 text-gray-900" />
        </div>
        <div className="flex flex-col items-center gap-1">
          <DesignMockupIcons.Add className="w-4 h-4 text-gray-600/80" />
        </div>
        <div className="flex flex-col items-center gap-1">
          <DesignMockupIcons.Messages className="w-4 h-4 text-gray-600/80" />
        </div>
        <div className="flex flex-col items-center gap-1">
          <DesignMockupIcons.Notifications className="w-4 h-4 text-gray-600/80" />
        </div>
      </div>
    </div>
  );
}
