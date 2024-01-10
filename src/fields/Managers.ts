import Input from './fieldManagers/InputField'
import Boolean from './fieldManagers/BooleanField'
import Number from './fieldManagers/NumberField'
import Select from './fieldManagers/SelectField'
import Cycle from './fieldManagers/CycleField'
import Multi from './fieldManagers/MultiField'
import File from './fieldManagers/FileField'
import Date from './fieldManagers/DateField'
import DateTime from './fieldManagers/DateTimeField'
import Time from './fieldManagers/TimeField'
import MultiFile from './fieldManagers/MultiFileField'
import Media from './fieldManagers/MediaField'
import MultiMedia from './fieldManagers/MultiMediaField'
import Lookup from './fieldManagers/LookupField'
import Formula from './fieldManagers/FormulaField'
import Canvas from './fieldManagers/CanvasField'
import CanvasGroup from './fieldManagers/CanvasGroupField'
import CanvasGroupLink from './fieldManagers/CanvasGroupLinkField'
import YAML from "./fieldManagers/YAMLField"
import JSON from "./fieldManagers/JSONField"
import Object from "./fieldManagers/ObjectField"
import ObjectList from "./fieldManagers/ObjectListField"

const Managers = {
    Input,
    Boolean,
    Number,
    Select,
    Cycle,
    Multi,
    File,
    Date,
    DateTime,
    Time,
    Media,
    MultiMedia,
    MultiFile,
    Lookup,
    Formula,
    Canvas,
    CanvasGroup,
    CanvasGroupLink,
    YAML,
    JSON,
    Object,
    ObjectList
}

export default Managers