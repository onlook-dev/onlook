import { Badge } from "@/components/ui/badge"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@/components/ui/pagination"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import React, { Fragment } from "react"
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  CreditCardIcon,
  FileIcon,
  HomeIcon,
  LineChartIcon,
  ListFilterIcon,
  MoveVerticalIcon,
  Package2Icon,
  PackageIcon,
  PanelLeftIcon,
  SearchIcon,
  ShoppingCartIcon,
  TruckIcon,
  UsersIcon,
} from "./shared"
import { Sidebar } from "./sidebar"

export function Dashboard() {
  return (
    <div
      className="flex min-h-screen w-full flex-col bg-muted/40"
      data-oid="_o_sdjo"
    >
      <React.Fragment>
        <Fragment>
          <Sidebar data-oid="oknd0qw" />
        </Fragment>
      </React.Fragment>
      <div
        className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14"
        data-oid="1kq7y0i"
      >
        <header
          className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6"
          data-oid="asprpov"
        >
          <Sheet data-oid="it.0ctg">
            <SheetTrigger asChild data-oid="w0sqb.s">
              <Button
                className="sm:hidden"
                size="icon"
                variant="outline"
                data-oid=".x2gl:1"
              >
                <PanelLeftIcon className="h-5 w-5" data-oid="ldj9h9p" />
                <span className="sr-only" data-oid="f9hmyg:">
                  Toggle Menu
                </span>
              </Button>
            </SheetTrigger>
            <SheetContent
              className="sm:max-w-xs"
              side="left"
              data-oid="5kis.wf"
            >
              <nav
                className="grid gap-6 text-lg font-medium"
                data-oid="t9f5bv0"
              >
                <Link
                  className="group flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:text-base"
                  href="#"
                  data-oid="yjm4-g."
                >
                  <Package2Icon
                    className="h-5 w-5 transition-all group-hover:scale-110"
                    data-oid="l5pl2.d"
                  />

                  <span className="sr-only" data-oid="59:uvif">
                    Acme Inc
                  </span>
                </Link>
                <Link
                  className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground"
                  href="#"
                  data-oid="e8834j."
                >
                  <HomeIcon className="h-5 w-5" data-oid=".s9v3nv" />
                  Dashboard
                </Link>
                <Link
                  className="flex items-center gap-4 px-2.5 text-foreground"
                  href="#"
                  data-oid="-8hdcdl"
                >
                  <ShoppingCartIcon className="h-5 w-5" data-oid="e5u7z8j" />
                  Orders
                </Link>
                <Link
                  className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground"
                  href="#"
                  data-oid="bko0gm1"
                >
                  <PackageIcon className="h-5 w-5" data-oid="4-xo4zh" />
                  Products
                </Link>
                <Link
                  className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground"
                  href="#"
                  data-oid="ogfccyf"
                >
                  <UsersIcon className="h-5 w-5" data-oid="uah1ow2" />
                  Customers
                </Link>
                <Link
                  className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground"
                  href="#"
                  data-oid="xl7oucw"
                >
                  <LineChartIcon className="h-5 w-5" data-oid="o:zulc-" />
                  Settings
                </Link>
              </nav>
            </SheetContent>
          </Sheet>
          <Breadcrumb className="hidden md:flex" data-oid="mfvxfj4">
            <BreadcrumbList data-oid="2ij2bn5">
              <BreadcrumbItem data-oid="xbel33:">
                <BreadcrumbLink asChild data-oid="-0lxqws">
                  <Link href="#" data-oid="hjd0e.3">
                    Dashboard
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator data-oid="xqimymj" />
              <BreadcrumbItem data-oid="xsjwgye">
                <BreadcrumbLink asChild data-oid="1zw_mho">
                  <Link href="#" data-oid="h.-9hin">
                    Orders
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator data-oid="qrurt-u" />
              <BreadcrumbItem data-oid="413eq90">
                <BreadcrumbPage data-oid="h:rites">
                  Recent Orders
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="relative ml-auto flex-1 md:grow-0" data-oid="p8f2sfa">
            <SearchIcon
              className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"
              data-oid=":1jca7b"
            />

            <Input
              className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[336px]"
              placeholder="Search..."
              type="search"
              data-oid="3f:8b5k"
            />
          </div>
          <DropdownMenu data-oid="ncuul64">
            <DropdownMenuTrigger asChild data-oid="98lqn92">
              <Button
                className="overflow-hidden rounded-full"
                size="icon"
                variant="outline"
                data-oid="0o0x4v4"
              >
                <img
                  alt="Avatar"
                  className="overflow-hidden rounded-full"
                  height={36}
                  src="/favicon.png"
                  style={{
                    aspectRatio: "36/36",
                    objectFit: "cover",
                  }}
                  width={36}
                  data-oid="xoj.jys"
                />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" data-oid="38sp5ir">
              <DropdownMenuLabel data-oid="_054ybx">
                My Account
              </DropdownMenuLabel>
              <DropdownMenuSeparator data-oid="d8jn5np" />
              <DropdownMenuItem data-oid="khs6fr.">Settings</DropdownMenuItem>
              <DropdownMenuItem data-oid="bvrhf9d">Support</DropdownMenuItem>
              <DropdownMenuSeparator data-oid="6exklx4" />
              <DropdownMenuItem data-oid="7aiw.8_">Logout</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main
          className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8 lg:grid-cols-3 xl:grid-cols-3"
          data-oid="uxv8xu0"
        >
          <div
            className="grid auto-rows-max items-start gap-4 md:gap-8 lg:col-span-2"
            data-oid="yfm0yma"
          >
            <div
              className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4"
              data-oid="tl-3hjv"
            >
              <Card
                className="sm:col-span-2 flex flex-col"
                x-chunk="dashboard-05-chunk-0"
                data-oid="_7sw2sf"
              >
                <CardHeader className="pb-3 flex flex-col" data-oid="y24pc88">
                  <CardTitle className="block" data-oid="lji0pmk">
                    Your Orders
                  </CardTitle>
                  <CardDescription
                    className="max-w-lg text-balance leading-relaxed"
                    data-oid="9.59yh7"
                  >
                    Introducing Our Dynamic Orders Dashboard for Seamless
                    Management and Insightful Analysis.
                  </CardDescription>
                </CardHeader>
                <CardFooter
                  className="flex-row gap-[30px] justify-center block"
                  data-oid="0b1ii9f"
                >
                  <Button data-oid="ety0vq_">Create New Order</Button>
                </CardFooter>
              </Card>
              <Card x-chunk="dashboard-05-chunk-1" data-oid="zob_vx7">
                <CardHeader className="pb-2" data-oid="zt7l2tr">
                  <CardDescription data-oid="ih.7w6j">
                    This Week
                  </CardDescription>
                  <CardTitle className="text-4xl" data-oid="ljuwi9n">
                    $1,329
                  </CardTitle>
                </CardHeader>
                <CardContent data-oid="udid4xr">
                  <div
                    className="text-xs text-muted-foreground"
                    data-oid="-g7mhaq"
                  >
                    +25% from last week
                  </div>
                </CardContent>
                <CardFooter data-oid="jm4xr41">
                  <Progress
                    aria-label="25% increase"
                    value={25}
                    data-oid="5p8tda6"
                  />
                </CardFooter>
              </Card>
              <Card x-chunk="dashboard-05-chunk-2" data-oid="0l.qjdm">
                <CardHeader className="pb-2" data-oid="n7r.gwr">
                  <CardDescription data-oid="c:s:s-h">
                    This Month
                  </CardDescription>
                  <CardTitle className="text-4xl" data-oid="r9a52qx">
                    $5,329
                  </CardTitle>
                </CardHeader>
                <CardContent data-oid="cm0l47s">
                  <div
                    className="text-xs text-muted-foreground"
                    data-oid="_a1k3r7"
                  >
                    +10% from last month
                  </div>
                </CardContent>
                <CardFooter data-oid="l32sxmr">
                  <Progress
                    aria-label="12% increase"
                    value={12}
                    data-oid="9m5w919"
                  />
                </CardFooter>
              </Card>
            </div>
            <Tabs defaultValue="week" data-oid="i_kv95.">
              <div className="flex items-center" data-oid=":y0gdsx">
                <TabsList data-oid="rqsobd_">
                  <TabsTrigger value="week" data-oid="tw9jthf">
                    Week
                  </TabsTrigger>
                  <TabsTrigger value="month" data-oid="p6zvu1w">
                    Month
                  </TabsTrigger>
                  <TabsTrigger value="year" data-oid="0rgf:47">
                    Year
                  </TabsTrigger>
                </TabsList>
                <div
                  className="ml-auto flex items-center gap-2"
                  data-oid="otstza_"
                >
                  <DropdownMenu data-oid="d37d544">
                    <DropdownMenuTrigger asChild data-oid="n4_4uc0">
                      <Button
                        className="h-7 gap-1 text-sm"
                        size="sm"
                        variant="outline"
                        data-oid="br86pyf"
                      >
                        <ListFilterIcon
                          className="h-3.5 w-3.5"
                          data-oid="10xf:_x"
                        />

                        <span
                          className="sr-only sm:not-sr-only"
                          data-oid="hhl.n5n"
                        >
                          Filter
                        </span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" data-oid="76xa:v.">
                      <DropdownMenuLabel data-oid="vemrc32">
                        Filter by
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator data-oid="_cw8g_:" />
                      <DropdownMenuCheckboxItem checked data-oid="0f3to58">
                        Fulfilled
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem data-oid="jhe-5mu">
                        Declined
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem data-oid="lu28uet">
                        Refunded
                      </DropdownMenuCheckboxItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    className="h-7 gap-1 text-sm"
                    size="sm"
                    variant="outline"
                    data-oid="-i9ie7q"
                  >
                    <FileIcon className="h-3.5 w-3.5" data-oid="ie-or-s" />
                    <span className="sr-only sm:not-sr-only" data-oid="7b2r568">
                      Export
                    </span>
                  </Button>
                </div>
              </div>
              <TabsContent value="week" data-oid="w0jgu3w">
                <Card x-chunk="dashboard-05-chunk-3" data-oid="-:zkut1">
                  <CardHeader className="px-7" data-oid="-_lhnme">
                    <CardTitle data-oid="i9-5re:">Orders</CardTitle>
                    <CardDescription data-oid="t73wn24">
                      Recent orders from your store.
                    </CardDescription>
                  </CardHeader>
                  <CardContent data-oid="v:548xx">
                    <Table data-oid="yxd_7-7">
                      <TableHeader data-oid="g0n:75x">
                        <TableRow data-oid="lts_t4w">
                          <TableHead data-oid=":-3_.fz">Customer</TableHead>
                          <TableHead
                            className="hidden sm:table-cell"
                            data-oid="840u.8y"
                          >
                            Type
                          </TableHead>
                          <TableHead
                            className="hidden sm:table-cell"
                            data-oid="85n8bz8"
                          >
                            Status
                          </TableHead>
                          <TableHead
                            className="hidden md:table-cell"
                            data-oid="y8253zu"
                          >
                            Date
                          </TableHead>
                          <TableHead className="text-right" data-oid="rw6i.r0">
                            Amount
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody data-oid="atvm2q.">
                        <TableRow className="bg-accent" data-oid="_tkklb7">
                          <TableCell data-oid="fmv4_d2">
                            <div className="font-medium" data-oid="_-s2kxi">
                              Liam Johnson
                            </div>
                            <div
                              className="hidden text-sm text-muted-foreground md:inline"
                              data-oid=":y89upy"
                            >
                              liam@example.com
                            </div>
                          </TableCell>
                          <TableCell
                            className="hidden sm:table-cell"
                            data-oid="vie1lfj"
                          >
                            Sale
                          </TableCell>
                          <TableCell
                            className="hidden sm:table-cell"
                            data-oid="2a:6ed3"
                          >
                            <Badge
                              className="text-xs"
                              variant="secondary"
                              data-oid="-525l9k"
                            >
                              Fulfilled
                            </Badge>
                          </TableCell>
                          <TableCell
                            className="hidden md:table-cell"
                            data-oid="j69b4_."
                          >
                            2023-06-23
                          </TableCell>
                          <TableCell className="text-right" data-oid="pthue6b">
                            $250.00
                          </TableCell>
                        </TableRow>
                        <TableRow data-oid="pf1o.xz">
                          <TableCell data-oid="y0vxl6a">
                            <div className="font-medium" data-oid="signtr2">
                              Olivia Smith
                            </div>
                            <div
                              className="hidden text-sm text-muted-foreground md:inline"
                              data-oid="1.mt4yy"
                            >
                              olivia@example.com
                            </div>
                          </TableCell>
                          <TableCell
                            className="hidden sm:table-cell"
                            data-oid="0ufs8qn"
                          >
                            Refund
                          </TableCell>
                          <TableCell
                            className="hidden sm:table-cell"
                            data-oid="-2q4sq-"
                          >
                            <Badge
                              className="text-xs"
                              variant="outline"
                              data-oid="tu3e32f"
                            >
                              Declined
                            </Badge>
                          </TableCell>
                          <TableCell
                            className="hidden md:table-cell"
                            data-oid="r506z1s"
                          >
                            2023-06-24
                          </TableCell>
                          <TableCell className="text-right" data-oid="022rnw3">
                            $150.00
                          </TableCell>
                        </TableRow>
                        <TableRow data-oid="0su3p-v">
                          <TableCell data-oid="4j2xqr7">
                            <div className="font-medium" data-oid="-6w-.0z">
                              Noah Williams
                            </div>
                            <div
                              className="hidden text-sm text-muted-foreground md:inline"
                              data-oid="4briw0m"
                            >
                              noah@example.com
                            </div>
                          </TableCell>
                          <TableCell
                            className="hidden sm:table-cell"
                            data-oid="fvbnhns"
                          >
                            Subscription
                          </TableCell>
                          <TableCell
                            className="hidden sm:table-cell"
                            data-oid="hw2tkgs"
                          >
                            <Badge
                              className="text-xs"
                              variant="secondary"
                              data-oid="or0hnkv"
                            >
                              Fulfilled
                            </Badge>
                          </TableCell>
                          <TableCell
                            className="hidden md:table-cell"
                            data-oid="68ywd4e"
                          >
                            2023-06-25
                          </TableCell>
                          <TableCell className="text-right" data-oid=".f627h4">
                            $350.00
                          </TableCell>
                        </TableRow>
                        <TableRow data-oid="bvdbbmt">
                          <TableCell data-oid=":1n76nx">
                            <div className="font-medium" data-oid="aw7sl14">
                              Emma Brown
                            </div>
                            <div
                              className="hidden text-sm text-muted-foreground md:inline"
                              data-oid="jv_twnm"
                            >
                              emma@example.com
                            </div>
                          </TableCell>
                          <TableCell
                            className="hidden sm:table-cell"
                            data-oid=".yfelhv"
                          >
                            Sale
                          </TableCell>
                          <TableCell
                            className="hidden sm:table-cell"
                            data-oid="-yiicty"
                          >
                            <Badge
                              className="text-xs"
                              variant="secondary"
                              data-oid=":et__lv"
                            >
                              Fulfilled
                            </Badge>
                          </TableCell>
                          <TableCell
                            className="hidden md:table-cell"
                            data-oid="gjw8_j8"
                          >
                            2023-06-26
                          </TableCell>
                          <TableCell className="text-right" data-oid="exg4bz_">
                            $450.00
                          </TableCell>
                        </TableRow>
                        <TableRow data-oid="h8k3uo.">
                          <TableCell data-oid="jtehukb">
                            <div className="font-medium" data-oid="wt5n71r">
                              Liam Johnson
                            </div>
                            <div
                              className="hidden text-sm text-muted-foreground md:inline"
                              data-oid="ww725b9"
                            >
                              liam@example.com
                            </div>
                          </TableCell>
                          <TableCell
                            className="hidden sm:table-cell"
                            data-oid="8gw7lh5"
                          >
                            Sale
                          </TableCell>
                          <TableCell
                            className="hidden sm:table-cell"
                            data-oid="ibz97do"
                          >
                            <Badge
                              className="text-xs"
                              variant="secondary"
                              data-oid="pbo8y9j"
                            >
                              Fulfilled
                            </Badge>
                          </TableCell>
                          <TableCell
                            className="hidden md:table-cell"
                            data-oid="uwl-y9d"
                          >
                            2023-06-23
                          </TableCell>
                          <TableCell className="text-right" data-oid="q67j84x">
                            $250.00
                          </TableCell>
                        </TableRow>
                        <TableRow data-oid="orphhh3">
                          <TableCell data-oid="ngh_uvy">
                            <div className="font-medium" data-oid="8ljn6xd">
                              Liam Johnson
                            </div>
                            <div
                              className="hidden text-sm text-muted-foreground md:inline"
                              data-oid="6..qm2a"
                            >
                              liam@example.com
                            </div>
                          </TableCell>
                          <TableCell
                            className="hidden sm:table-cell"
                            data-oid="t_:i5i."
                          >
                            Sale
                          </TableCell>
                          <TableCell
                            className="hidden sm:table-cell"
                            data-oid="8ax0nvh"
                          >
                            <Badge
                              className="text-xs"
                              variant="secondary"
                              data-oid="kk5i:_k"
                            >
                              Fulfilled
                            </Badge>
                          </TableCell>
                          <TableCell
                            className="hidden md:table-cell"
                            data-oid="lbfxn9_"
                          >
                            2023-06-23
                          </TableCell>
                          <TableCell className="text-right" data-oid="isn33un">
                            $250.00
                          </TableCell>
                        </TableRow>
                        <TableRow data-oid="j-srzp1">
                          <TableCell data-oid="bflvhku">
                            <div className="font-medium" data-oid="xo6qbh7">
                              Olivia Smith
                            </div>
                            <div
                              className="hidden text-sm text-muted-foreground md:inline"
                              data-oid="m2k9a3p"
                            >
                              olivia@example.com
                            </div>
                          </TableCell>
                          <TableCell
                            className="hidden sm:table-cell"
                            data-oid="uj529ka"
                          >
                            Refund
                          </TableCell>
                          <TableCell
                            className="hidden sm:table-cell"
                            data-oid="1qozl_l"
                          >
                            <Badge
                              className="text-xs"
                              variant="outline"
                              data-oid="s-gkupn"
                            >
                              Declined
                            </Badge>
                          </TableCell>
                          <TableCell
                            className="hidden md:table-cell"
                            data-oid="2q3x6ru"
                          >
                            2023-06-24
                          </TableCell>
                          <TableCell className="text-right" data-oid="2:gimek">
                            $150.00
                          </TableCell>
                        </TableRow>
                        <TableRow data-oid="j5k-g_w">
                          <TableCell data-oid="7-.rvs.">
                            <div className="font-medium" data-oid="z7:9-1z">
                              Emma Brown
                            </div>
                            <div
                              className="hidden text-sm text-muted-foreground md:inline"
                              data-oid="cgd3m5s"
                            >
                              emma@example.com
                            </div>
                          </TableCell>
                          <TableCell
                            className="hidden sm:table-cell"
                            data-oid="_68d.y8"
                          >
                            Sale
                          </TableCell>
                          <TableCell
                            className="hidden sm:table-cell"
                            data-oid="13bnres"
                          >
                            <Badge
                              className="text-xs"
                              variant="secondary"
                              data-oid="s_gkgrv"
                            >
                              Fulfilled
                            </Badge>
                          </TableCell>
                          <TableCell
                            className="hidden md:table-cell"
                            data-oid="8afnh:e"
                          >
                            2023-06-26
                          </TableCell>
                          <TableCell className="text-right" data-oid="3n37vvg">
                            $450.00
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
          <div data-oid="_o8iz58">
            <Card
              className="overflow-hidden"
              x-chunk="dashboard-05-chunk-4"
              data-oid="20:e.49"
            >
              <CardHeader
                className="flex flex-row items-start bg-muted/50"
                data-oid="0:pt15n"
              >
                <div className="grid gap-0.5" data-oid="g4r1d-a">
                  <CardTitle
                    className="group flex items-center gap-2 text-lg"
                    data-oid=".3z2-z9"
                  >
                    Order Oe31b70H
                    <Button
                      className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
                      size="icon"
                      variant="outline"
                      data-oid="4ha68p4"
                    >
                      <CopyIcon className="h-3 w-3" data-oid="5:dqlmv" />
                      <span className="sr-only" data-oid="dxsymiq">
                        Copy Order ID
                      </span>
                    </Button>
                  </CardTitle>
                  <CardDescription data-oid="t5qzcyw">
                    Date: November 23, 2023
                  </CardDescription>
                </div>
                <div
                  className="ml-auto flex items-center gap-1"
                  data-oid="ay6wr.."
                >
                  <Button
                    className="h-8 gap-1"
                    size="sm"
                    variant="outline"
                    data-oid="yga-xhp"
                  >
                    <TruckIcon className="h-3.5 w-3.5" data-oid="yl76n7l" />
                    <span
                      className="lg:sr-only xl:not-sr-only xl:whitespace-nowrap"
                      data-oid="hbum0gs"
                    >
                      Track Order
                    </span>
                  </Button>
                  <DropdownMenu data-oid="q_.7m_b">
                    <DropdownMenuTrigger asChild data-oid="sf1dwes">
                      <Button
                        className="h-8 w-8"
                        size="icon"
                        variant="outline"
                        data-oid="c8d.8iy"
                      >
                        <MoveVerticalIcon
                          className="h-3.5 w-3.5"
                          data-oid=".aj6vq8"
                        />

                        <span className="sr-only" data-oid="w.60h3z">
                          More
                        </span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" data-oid="gvd.m:m">
                      <DropdownMenuItem data-oid="ae_055j">
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem data-oid="fy.3-iu">
                        Export
                      </DropdownMenuItem>
                      <DropdownMenuSeparator data-oid="9nw3f-y" />
                      <DropdownMenuItem data-oid="r83kxf.">
                        Trash
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="p-6 text-sm" data-oid="h68neaa">
                <div className="grid gap-3" data-oid="ywbfwpl">
                  <div className="font-semibold" data-oid="vf3.:wq">
                    Order Details
                  </div>
                  <ul className="grid gap-3" data-oid="-v2hc4i">
                    <li
                      className="flex items-center justify-between"
                      data-oid="5hd2vzy"
                    >
                      <span
                        className="text-muted-foreground"
                        data-oid="r.xqdq1"
                      >
                        Glimmer Lamps x<span data-oid="nleifny">2</span>
                      </span>
                      <span data-oid="2blp7lx">$250.00</span>
                    </li>
                    <li
                      className="flex items-center justify-between"
                      data-oid="7t:foq."
                    >
                      <span
                        className="text-muted-foreground"
                        data-oid="j-mwf4:"
                      >
                        Aqua Filters x<span data-oid="kzf3v:b">1</span>
                      </span>
                      <span data-oid="9n-8fi_">$49.00</span>
                    </li>
                  </ul>
                  <Separator className="my-2" data-oid=".prtseq" />
                  <ul className="grid gap-3" data-oid="_pkl5rq">
                    <li
                      className="flex items-center justify-between"
                      data-oid="2z_5bhn"
                    >
                      <span
                        className="text-muted-foreground"
                        data-oid="-hu3hd2"
                      >
                        Subtotal
                      </span>
                      <span data-oid=":3ub715">$299.00</span>
                    </li>
                    <li
                      className="flex items-center justify-between"
                      data-oid="ok87h7n"
                    >
                      <span
                        className="text-muted-foreground"
                        data-oid="r6pv5l3"
                      >
                        Shipping
                      </span>
                      <span data-oid="dxnbmvi">$5.00</span>
                    </li>
                    <li
                      className="flex items-center justify-between"
                      data-oid="u2ipi2p"
                    >
                      <span
                        className="text-muted-foreground"
                        data-oid="6u94px."
                      >
                        Tax
                      </span>
                      <span data-oid="us06und">$25.00</span>
                    </li>
                    <li
                      className="flex items-center justify-between font-semibold"
                      data-oid="s-1a-7w"
                    >
                      <span
                        className="text-muted-foreground"
                        data-oid="a38d67f"
                      >
                        Total
                      </span>
                      <span data-oid="7m6-oiz">$329.00</span>
                    </li>
                  </ul>
                </div>
                <Separator className="my-4" data-oid="l7xud:j" />
                <div className="grid grid-cols-2 gap-4" data-oid="om8n9js">
                  <div className="grid gap-3" data-oid="1anb7pf">
                    <div className="font-semibold" data-oid="ap-sy.o">
                      Shipping Information
                    </div>
                    <address
                      className="grid gap-0.5 not-italic text-muted-foreground"
                      data-oid="yz_b8wp"
                    >
                      <span data-oid="m0qaxaf">Liam Johnson</span>
                      <span data-oid="pe2y2gp">1234 Main St.</span>
                      <span data-oid="2t8rwso">Anytown, CA 12345</span>
                    </address>
                  </div>
                  <div className="grid auto-rows-max gap-3" data-oid="_4u5xeq">
                    <div className="font-semibold" data-oid="3jf-m4c">
                      Billing Information
                    </div>
                    <div className="text-muted-foreground" data-oid="cczvcoa">
                      Same as shipping address
                    </div>
                  </div>
                </div>
                <Separator className="my-4" data-oid="oudvz9g" />
                <div className="grid gap-3" data-oid="hkew:9t">
                  <div className="font-semibold" data-oid="vp8uuo5">
                    Customer Information
                  </div>
                  <dl className="grid gap-3" data-oid="eexwblj">
                    <div
                      className="flex items-center justify-between"
                      data-oid="-p7z5ja"
                    >
                      <dt className="text-muted-foreground" data-oid="3h:6_nl">
                        Customer
                      </dt>
                      <dd data-oid="66boqdw">Liam Johnson</dd>
                    </div>
                    <div
                      className="flex items-center justify-between"
                      data-oid="s6l94bt"
                    >
                      <dt className="text-muted-foreground" data-oid="d_oryb8">
                        Email
                      </dt>
                      <dd data-oid="zi4g2q3">
                        <a href="#" data-oid="w8un0hk">
                          liam@acme.com
                        </a>
                      </dd>
                    </div>
                    <div
                      className="flex items-center justify-between"
                      data-oid="gqy8hgv"
                    >
                      <dt className="text-muted-foreground" data-oid="eqzq6y9">
                        Phone
                      </dt>
                      <dd data-oid="6.ftlfy">
                        <a href="#" data-oid="s4pmda3">
                          +1 234 567 890
                        </a>
                      </dd>
                    </div>
                  </dl>
                </div>
                <Separator className="my-4" data-oid="2a4ndbb" />
                <div className="grid gap-3" data-oid=":b9.ofu">
                  <div className="font-semibold" data-oid="rnh.x:v">
                    Payment Information
                  </div>
                  <dl className="grid gap-3" data-oid="8m4s.:m">
                    <div
                      className="flex items-center justify-between"
                      data-oid="e5gpxyc"
                    >
                      <dt
                        className="flex items-center gap-1 text-muted-foreground"
                        data-oid="w5tff_x"
                      >
                        <CreditCardIcon
                          className="h-4 w-4"
                          data-oid="foila35"
                        />
                        Visa
                      </dt>
                      <dd data-oid="igh4k_n">**** **** **** 4532</dd>
                    </div>
                  </dl>
                </div>
              </CardContent>
              <CardFooter
                className="flex flex-row items-center border-t bg-muted/50 px-6 py-3"
                data-oid="6zjfnxp"
              >
                <div
                  className="text-xs text-muted-foreground"
                  data-oid="soaun:q"
                >
                  Updated
                  <time dateTime="2023-11-23" data-oid="9ey2frq">
                    November 23, 2023
                  </time>
                </div>
                <Pagination className="ml-auto mr-0 w-auto" data-oid="huy5:jb">
                  <PaginationContent data-oid="fjo730p">
                    <PaginationItem data-oid="7i42noo">
                      <Button
                        className="h-6 w-6"
                        size="icon"
                        variant="outline"
                        data-oid="enyze5q"
                      >
                        <ChevronLeftIcon
                          className="h-3.5 w-3.5"
                          data-oid="wb24:-a"
                        />

                        <span className="sr-only" data-oid="t9kwsv8">
                          Previous Order
                        </span>
                      </Button>
                    </PaginationItem>
                    <PaginationItem data-oid="1vzbym5">
                      <Button
                        className="h-6 w-6"
                        size="icon"
                        variant="outline"
                        data-oid="w48admk"
                      >
                        <ChevronRightIcon
                          className="h-3.5 w-3.5"
                          data-oid="dok5c3n"
                        />

                        <span className="sr-only" data-oid="nc-97el">
                          Next Order
                        </span>
                      </Button>
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </CardFooter>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
