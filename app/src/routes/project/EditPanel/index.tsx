import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MagicWandIcon } from '@radix-ui/react-icons';
import { observer } from 'mobx-react-lite';
import ManualTab from "./ManualTab";

const EditPanel = observer(() => {
  enum TabValue {
    MANUAL = "manual",
    ASSISTED = "assisted",
  }
  let selectedTab: string = TabValue.MANUAL;

  return (
    <div className='max-w-60 min-w-60'>
      <Tabs defaultValue={selectedTab}>
        <TabsList className="bg-transparent w-full p-0 gap-4 select-none">
          <TabsTrigger
            className="bg-transparent p-0 text-xs"
            value={TabValue.MANUAL}>Set Styles
          </TabsTrigger>
          <TabsTrigger
            className="bg-transparent p-0 text-xs"
            value={TabValue.ASSISTED}
          >
            <MagicWandIcon className="mr-2" />
            AI Styles
          </TabsTrigger>
        </TabsList>
        <Separator className="mt-1" />
        <div className="h-[calc(100vh-7.75rem)] overflow-auto">
          <TabsContent value={TabValue.MANUAL}>
            <ManualTab />
          </TabsContent>
          <TabsContent value={TabValue.ASSISTED}
          >
            <div className="w-full pt-96   text-center opacity-70">
              AI Styles coming soon
            </div>
          </TabsContent>
        </div>

      </Tabs >
    </div >
  );
});

export default EditPanel;
