import React from 'react';
import { Icons } from '@onlook/ui/icons';

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
          className="w-full mb-1 object-cover relative z-10"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      </div>
      <p className={`text-[7px] ${lightMode ? 'text-gray-600' : 'text-gray-300'} leading-tight font-mono uppercase mb-3`}>{caption}</p>
    </div>
  );
}

export function DesignMockup() {
  return (
    <div className="bg-gray-800 w-140 h-140 rounded-sm flex flex-col overflow-hidden">
      {/* Top Navigation Bar */}
      <div className="h-8 bg-gray-900 border-b border-[0.5px] border-gray-600/50 flex items-center px-2 py-1 gap-2">
        {/* Pinterest Logo */}
        <div className="w-5 h-5 bg-black rounded flex items-center justify-center">
          <span className="text-white text-xs font-bold">V</span>
        </div>
        
        {/* Search Bar */}
        <div className="flex-1 flex items-center bg-gray-600/50 rounded-full px-3 py-1">
          <span className="text-[8px] text-gray-200 font-mono tracking-tight">Brutalist lair decor</span>
          <div className="ml-auto flex items-center gap-1">
            <Icons.CrossL className="w-2.5 h-2.5 text-gray-400" />
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
        <div className="w-11 flex flex-col items-center py-3 h-full justify-between">
          <div className="flex flex-col items-center gap-3">
            <Icons.MagnifyingGlass className="w-3 h-3 text-gray-400" />
            <Icons.Sparkles className="w-3 h-3 text-gray-400" />
            <Icons.ChatBubble className="w-3 h-3 text-gray-400" />
            <Icons.Person className="w-3 h-3 text-gray-400" />
          </div>
          <div className="items-center justify-end h-12">
            <Icons.Gear className="w-3 h-3 text-gray-400" />
          </div>
          
        </div>
        
        {/* Image Grid */}
        <div className="flex-1 pt-3 pr-4 h-full">
          <div className="columns-4 gap-4 h-full overflow-y-auto">
            {/* Image Cards */}
            <ImageCard
              src="/assets/the___daniel_httpss.mj.run4iXjsEavMyQ_minimalist_interior_wit_310f6c88-ea16-448f-af55-16f51782132a_1.png"
              alt="Minimalist Interior with Dramatic Lighting"
              caption="Minimalist Interior with Dramatic Lighting"
              isSelected={true}
            />
            <ImageCard
              src="/assets/the___daniel_httpss.mj.run8EdjwNCSTns_black_leather_bar_stool_013dbd70-a2cc-44f7-a314-bbe275b86563_3.png"
              alt="Black Leather Bar Stool"
              caption="Black Leather Bar Stool with Brass Accents"
            />
            <ImageCard
              src="/assets/the___daniel_httpss.mj.runAp9BRoSUG-Q_silhouette_of_a_black_b_66ef6127-e9fd-4a70-8769-989d81178b23_1.png"
              alt="Black Bar Stool Silhouette"
              caption="Black Bar Stool Silhouette Design"
            />
            <ImageCard
              src="/assets/the___daniel_httpss.mj.runcW6Xiv8NRPs_close-up_of_two_ceramic_de5b83cb-7ee5-4430-af5b-f868d487ebe4_2.png"
              alt="Ceramic Brutalist Objects"
              caption="Ceramic Brutalist Objects with Spikes"
            />
            <ImageCard
              src="/assets/the___daniel_httpss.mj.runF-rvbzgq3F8_brutalist_dark_glass_va_748a3c8c-a6a5-4840-93e7-efbbffcce8f1_1.png"
              alt="Brutalist Dark Glass Vase"
              caption="Brutalist Dark Glass Vase Sculpture"
            />
            <ImageCard
              src="/assets/the___daniel_httpss.mj.runKt88JTu6rPQ_golden_muted_sharp_inte_324633e8-d399-4025-9a0f-a6010f1c4df2_0.png"
              alt="Golden Muted Interior"
              caption="Golden Muted Interior with Sharp Lines"
            />
            <ImageCard
              src="/assets/the___daniel_httpss.mj.runMVYWfDFX_XE_realistic_contemporary__fe607fdd-058e-47bf-ab6f-d22b732c2f66_2.png"
              alt="Contemporary Brutalist Interior"
              caption="Contemporary Brutalist Interior Design"
            />
            <ImageCard
              src="/assets/the___daniel_httpss.mj.runPguWEsbeT0k_two_minimalist_zig-zag__7f026ef1-b94a-4fce-a7c3-551f51cf0726_0.png"
              alt="Minimalist Zig-Zag Chairs"
              caption="Minimalist Zig-Zag Chair Design"
            />
            <ImageCard
              src="/assets/the___daniel_httpss.mj.runpYhbRvhCgnQ_minimalist_metalic_shee_8daa01a7-2b6e-4bb4-9e13-6c6ac6f05959_1.png"
              alt="Minimalist Metallic Sheer"
              caption="Minimalist Metallic Sheer Design"
            />
            <ImageCard
              src="/assets/the___daniel_httpss.mj.runSh8wz2Xb28A_lounge_chair_against_a__ddb9bc7d-889d-4ea1-9129-48646172c544_2.png"
              alt="Lounge Chair Against Wall"
              caption="Lounge Chair Against Clean Wall"
            />
            <ImageCard
              src="/assets/the___daniel_httpss.mj.runzX8_66H3mvo_spikey_ceramic_iron_met_4e9c30d0-e0cd-4f56-87f7-f62c2f691c08_2.png"
              alt="Spikey Ceramic Iron Metal"
              caption="Spikey Ceramic Iron Metal Sculpture"
            />
            <ImageCard
              src="/assets/the___daniel_httpss.mj.run4iXjsEavMyQ_minimalist_interior_wit_310f6c88-ea16-448f-af55-16f51782132a_1.png"
              alt="Minimalist Interior Design"
              caption="Minimalist Interior Design Concepts"
            />
            <ImageCard
              src="/assets/the___daniel_httpss.mj.run8EdjwNCSTns_black_leather_bar_stool_013dbd70-a2cc-44f7-a314-bbe275b86563_3.png"
              alt="Black Leather Furniture"
              caption="Black Leather Furniture Design"
            />
            <ImageCard
              src="/assets/the___daniel_httpss.mj.runAp9BRoSUG-Q_silhouette_of_a_black_b_66ef6127-e9fd-4a70-8769-989d81178b23_1.png"
              alt="Black Silhouette Design"
              caption="Black Silhouette Design Elements"
            />
            <ImageCard
              src="/assets/the___daniel_httpss.mj.runcW6Xiv8NRPs_close-up_of_two_ceramic_de5b83cb-7ee5-4430-af5b-f868d487ebe4_2.png"
              alt="Ceramic Brutalist Art"
              caption="Ceramic Brutalist Art Objects"
            />
            <ImageCard
              src="/assets/the___daniel_httpss.mj.runF-rvbzgq3F8_brutalist_dark_glass_va_748a3c8c-a6a5-4840-93e7-efbbffcce8f1_1.png"
              alt="Dark Glass Vase"
              caption="Dark Glass Vase Sculpture"
            />
            <ImageCard
              src="/assets/the___daniel_httpss.mj.runKt88JTu6rPQ_golden_muted_sharp_inte_324633e8-d399-4025-9a0f-a6010f1c4df2_0.png"
              alt="Golden Interior Design"
              caption="Golden Interior Design Elements"
            />
            <ImageCard
              src="/assets/the___daniel_httpss.mj.runMVYWfDFX_XE_realistic_contemporary__fe607fdd-058e-47bf-ab6f-d22b732c2f66_2.png"
              alt="Contemporary Interior"
              caption="Contemporary Interior Styling"
            />
            <ImageCard
              src="/assets/the___daniel_httpss.mj.runPguWEsbeT0k_two_minimalist_zig-zag__7f026ef1-b94a-4fce-a7c3-551f51cf0726_0.png"
              alt="Zig-Zag Chair Design"
              caption="Zig-Zag Chair Design Elements"
            />
            <ImageCard
              src="/assets/the___daniel_httpss.mj.runpYhbRvhCgnQ_minimalist_metalic_shee_8daa01a7-2b6e-4bb4-9e13-6c6ac6f05959_1.png"
              alt="Metallic Sheer Design"
              caption="Metallic Sheer Design Elements"
            />
            <ImageCard
              src="/assets/the___daniel_httpss.mj.runSh8wz2Xb28A_lounge_chair_against_a__ddb9bc7d-889d-4ea1-9129-48646172c544_2.png"
              alt="Lounge Chair Design"
              caption="Lounge Chair Design Concepts"
            />
            <ImageCard
              src="/assets/the___daniel_httpss.mj.runzX8_66H3mvo_spikey_ceramic_iron_met_4e9c30d0-e0cd-4f56-87f7-f62c2f691c08_2.png"
              alt="Spikey Ceramic Design"
              caption="Spikey Ceramic Design Elements"
            />
            <ImageCard
              src="/assets/the___daniel_httpss.mj.run4iXjsEavMyQ_minimalist_interior_wit_310f6c88-ea16-448f-af55-16f51782132a_1.png"
              alt="Minimalist Design"
              caption="Minimalist Design Concepts"
            />
            <ImageCard
              src="/assets/the___daniel_httpss.mj.run8EdjwNCSTns_black_leather_bar_stool_013dbd70-a2cc-44f7-a314-bbe275b86563_3.png"
              alt="Black Leather Design"
              caption="Black Leather Design Elements"
            />
            <ImageCard
              src="/assets/the___daniel_httpss.mj.runAp9BRoSUG-Q_silhouette_of_a_black_b_66ef6127-e9fd-4a70-8769-989d81178b23_1.png"
              alt="Black Design Elements"
              caption="Black Design Elements"
            />
            <ImageCard
              src="/assets/the___daniel_httpss.mj.runcW6Xiv8NRPs_close-up_of_two_ceramic_de5b83cb-7ee5-4430-af5b-f868d487ebe4_2.png"
              alt="Ceramic Design"
              caption="Ceramic Design Elements"
            />
            <ImageCard
              src="/assets/the___daniel_httpss.mj.runF-rvbzgq3F8_brutalist_dark_glass_va_748a3c8c-a6a5-4840-93e7-efbbffcce8f1_1.png"
              alt="Glass Vase Design"
              caption="Glass Vase Design Elements"
            />
            <ImageCard
              src="/assets/the___daniel_httpss.mj.runKt88JTu6rPQ_golden_muted_sharp_inte_324633e8-d399-4025-9a0f-a6010f1c4df2_0.png"
              alt="Golden Design"
              caption="Golden Design Elements"
            />
            <ImageCard
              src="/assets/the___daniel_httpss.mj.runMVYWfDFX_XE_realistic_contemporary__fe607fdd-058e-47bf-ab6f-d22b732c2f66_2.png"
              alt="Contemporary Design"
              caption="Contemporary Design Elements"
            />
            <ImageCard
              src="/assets/the___daniel_httpss.mj.runPguWEsbeT0k_two_minimalist_zig-zag__7f026ef1-b94a-4fce-a7c3-551f51cf0726_0.png"
              alt="Zig-Zag Design"
              caption="Zig-Zag Design Elements"
            />
            <ImageCard
              src="/assets/the___daniel_httpss.mj.runpYhbRvhCgnQ_minimalist_metalic_shee_8daa01a7-2b6e-4bb4-9e13-6c6ac6f05959_1.png"
              alt="Metallic Elements"
              caption="Metallic Design Elements"
            />
            <ImageCard
              src="/assets/the___daniel_httpss.mj.runSh8wz2Xb28A_lounge_chair_against_a__ddb9bc7d-889d-4ea1-9129-48646172c544_2.png"
              alt="Lounge Elements"
              caption="Lounge Design Elements"
            />
            <ImageCard
              src="/assets/the___daniel_httpss.mj.runzX8_66H3mvo_spikey_ceramic_iron_met_4e9c30d0-e0cd-4f56-87f7-f62c2f691c08_2.png"
              alt="Spikey Elements"
              caption="Spikey Design Elements"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function DesignMockupMobile() {
  return (
    <div className="bg-[#FFFFEE] w-80 h-140 rounded-sm flex flex-col overflow-hidden border border-gray-200">
      {/* Top Navigation Bar */}
      <div className="h-8 border-b border-[0.5px] border-gray-100/50 flex items-center px-2 py-1 gap-2">
        {/* Pinterest Logo */}
        <div className="w-5 h-5 bg-black rounded flex items-center justify-center">
          <span className="text-white text-xs font-bold">V</span>
        </div>
        
        {/* Search Bar */}
        <div className="flex-1 flex items-center bg-gray-100/50 rounded-full px-3 py-1">
          <span className="text-[8px] text-gray-400 font-mono tracking-tight">Brutalist lair decor</span>
          <div className="ml-auto flex items-center gap-1">
            <Icons.CrossL className="w-2.5 h-2.5 text-gray-500" />
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
            <Icons.MagnifyingGlass className="w-3 h-3 text-gray-600" />
            <Icons.Sparkles className="w-3 h-3 text-gray-600" />
            <Icons.ChatBubble className="w-3 h-3 text-gray-600" />
            <Icons.Person className="w-3 h-3 text-gray-600" />
          </div>
          <div className="items-center justify-end h-12">
            <Icons.Gear className="w-3 h-3 text-gray-600" />
          </div>
          
        </div>
        
        {/* Image Grid */}
        <div className="flex-1 pt-3 px-4 h-full">
          <div className="columns-3 gap-3 h-full overflow-y-auto">
            {/* Image Cards */}
            <ImageCard
              src="/assets/the___daniel_httpss.mj.run4iXjsEavMyQ_minimalist_interior_wit_310f6c88-ea16-448f-af55-16f51782132a_1.png"
              alt="Minimalist Interior with Dramatic Lighting"
              caption="Minimalist Interior with Dramatic Lighting"
              isSelected={false}
              lightMode={true}
            />
            <ImageCard
              src="/assets/the___daniel_httpss.mj.run8EdjwNCSTns_black_leather_bar_stool_013dbd70-a2cc-44f7-a314-bbe275b86563_3.png"
              alt="Black Leather Bar Stool"
              caption="Black Leather Bar Stool with Brass Accents"
              lightMode={true}
            />
            <ImageCard
              src="/assets/the___daniel_httpss.mj.runAp9BRoSUG-Q_silhouette_of_a_black_b_66ef6127-e9fd-4a70-8769-989d81178b23_1.png"
              alt="Black Bar Stool Silhouette"
              caption="Black Bar Stool Silhouette Design"
              lightMode={true}
            />
            <ImageCard
              src="/assets/the___daniel_httpss.mj.runcW6Xiv8NRPs_close-up_of_two_ceramic_de5b83cb-7ee5-4430-af5b-f868d487ebe4_2.png"
              alt="Ceramic Brutalist Objects"
              caption="Ceramic Brutalist Objects with Spikes"
              lightMode={true}
            />
            <ImageCard
              src="/assets/the___daniel_httpss.mj.runF-rvbzgq3F8_brutalist_dark_glass_va_748a3c8c-a6a5-4840-93e7-efbbffcce8f1_1.png"
              alt="Brutalist Dark Glass Vase"
              caption="Brutalist Dark Glass Vase Sculpture"
              lightMode={true}
            />
            <ImageCard
              src="/assets/the___daniel_httpss.mj.runKt88JTu6rPQ_golden_muted_sharp_inte_324633e8-d399-4025-9a0f-a6010f1c4df2_0.png"
              alt="Golden Muted Interior"
              caption="Golden Muted Interior with Sharp Lines"
              lightMode={true}
            />
            <ImageCard
              src="/assets/the___daniel_httpss.mj.runMVYWfDFX_XE_realistic_contemporary__fe607fdd-058e-47bf-ab6f-d22b732c2f66_2.png"
              alt="Contemporary Brutalist Interior"
              caption="Contemporary Brutalist Interior Design"
              lightMode={true}
            />
            <ImageCard
              src="/assets/the___daniel_httpss.mj.runPguWEsbeT0k_two_minimalist_zig-zag__7f026ef1-b94a-4fce-a7c3-551f51cf0726_0.png"
              alt="Minimalist Zig-Zag Chairs"
              caption="Minimalist Zig-Zag Chair Design"
              lightMode={true}
            />
            <ImageCard
              src="/assets/the___daniel_httpss.mj.runpYhbRvhCgnQ_minimalist_metalic_shee_8daa01a7-2b6e-4bb4-9e13-6c6ac6f05959_1.png"
              alt="Minimalist Metallic Sheer"
              caption="Minimalist Metallic Sheer Design"
              lightMode={true}
            />
            <ImageCard
              src="/assets/the___daniel_httpss.mj.runSh8wz2Xb28A_lounge_chair_against_a__ddb9bc7d-889d-4ea1-9129-48646172c544_2.png"
              alt="Lounge Chair Against Wall"
              caption="Lounge Chair Against Clean Wall"
              lightMode={true}
            />
            <ImageCard
              src="/assets/the___daniel_httpss.mj.runzX8_66H3mvo_spikey_ceramic_iron_met_4e9c30d0-e0cd-4f56-87f7-f62c2f691c08_2.png"
              alt="Spikey Ceramic Iron Metal"
              caption="Spikey Ceramic Iron Metal Sculpture"
              lightMode={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
