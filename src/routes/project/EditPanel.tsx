import { observer } from 'mobx-react-lite';
import { useEditorEngine } from ".";

const EditPanel = observer(() => {
  const editorEngine = useEditorEngine();

  return (
    <div className='w-80 min-w-52'>
      {editorEngine.state.selected.map((element) => (
        <div key={element.selector} className=''>
          {JSON.stringify(element.computedStyle)}
        </div>
      ))}
    </div>
  );
});

export default EditPanel;
